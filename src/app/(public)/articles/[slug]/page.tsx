import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  calculateReadingTime,
  getAllArticles,
  readArticleFile,
} from "@/lib/mdx";
import { Mdx } from "@/components/mdx/Mdx";
import { TableOfContents } from "@/components/article/TableOfContents";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { articleJsonLd } from "@/lib/seo";
import { extractToc } from "@/lib/toc";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = readArticleFile(slug);
  if (!article) return {};

  const { title, description, coverImage, publishedAt } = article.frontmatter;
  return {
    title,
    description,
    alternates: { canonical: `/articles/${slug}` },
    authors: [{ name: site.author }],
    openGraph: {
      type: "article",
      title,
      description,
      url: `${site.url}/articles/${slug}`,
      publishedTime: publishedAt,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = readArticleFile(slug);
  if (!article) notFound();

  const { frontmatter, content } = article;
  const date = formatDate(frontmatter.publishedAt);
  const readingTime = calculateReadingTime(content);

  const jsonLd = articleJsonLd({
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    publishedAt: frontmatter.publishedAt,
    tags: frontmatter.tags,
    coverImage: frontmatter.coverImage,
    authorName: site.author,
    baseUrl: site.url,
  });

  const toc = extractToc(content);

  return (
    <div className="mx-auto max-w-3xl xl:grid xl:max-w-5xl xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
      <article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Link
          href="/"
          className="text-sm text-muted transition-colors hover:text-terracotta"
        >
          ← Back
        </Link>

        <header className="mt-6 border-b border-border pb-8">
          <div className="mb-3 flex items-center gap-3 text-sm text-faint">
            {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
            {date && <span aria-hidden>·</span>}
            <span>{readingTime} min read</span>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {frontmatter.title}
          </h1>
          {frontmatter.description && (
            <p className="mt-3 font-prose text-xl leading-relaxed text-muted">
              {frontmatter.description}
            </p>
          )}
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {frontmatter.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${tag}`}
                  className="text-sm text-faint transition-colors hover:text-terracotta"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {toc.length > 0 && (
          <details className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 xl:hidden">
            <summary className="cursor-pointer font-display text-sm font-semibold text-ink">
              Contents
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {toc.map((item) => (
                <li key={item.id} className={item.depth === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${item.id}`}
                    className="text-muted transition-colors hover:text-terracotta"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-8">
          <Mdx source={content} />
        </div>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <TableOfContents items={toc} />
        </div>
      </aside>
    </div>
  );
}

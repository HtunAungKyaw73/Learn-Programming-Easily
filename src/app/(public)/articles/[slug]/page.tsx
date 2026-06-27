import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicArticleBySlug, getPublishedSlugs } from "@/lib/queries";
import { Mdx } from "@/components/mdx/Mdx";
import { TableOfContents } from "@/components/article/TableOfContents";
import { Container } from "@/components/site/Container";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { articleJsonLd } from "@/lib/seo";
import { extractToc } from "@/lib/toc";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) return {};

  const { title, description, coverImage, publishedAt } = article;
  return {
    title,
    description: description ?? undefined,
    alternates: { canonical: `/articles/${slug}` },
    authors: [{ name: site.author }],
    openGraph: {
      type: "article",
      title,
      description: description ?? undefined,
      url: `${site.url}/articles/${slug}`,
      publishedTime: publishedAt?.toISOString(),
      ...(coverImage ? { images: [coverImage] } : {}),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) notFound();

  const { title, description, content } = article;
  const tags = article.tags.map((t) => t.name);
  const publishedAtIso = article.publishedAt?.toISOString();
  const date = formatDate(publishedAtIso);
  const readingTime = article.readingTime ?? 1;

  const jsonLd = articleJsonLd({
    slug,
    title,
    description: description ?? undefined,
    publishedAt: publishedAtIso,
    tags,
    coverImage: article.coverImage ?? undefined,
    authorName: site.author,
    baseUrl: site.url,
  });

  const toc = extractToc(content);

  return (
    <Container className="relative">
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
            {date && <time dateTime={publishedAtIso}>{date}</time>}
            {date && <span aria-hidden>·</span>}
            <span>{readingTime} min read</span>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 font-prose text-xl leading-relaxed text-muted">
              {description}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
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

      <aside className="absolute inset-y-0 left-full ml-8 hidden w-52 xl:block">
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pr-2">
          <TableOfContents items={toc} />
        </div>
      </aside>
    </Container>
  );
}

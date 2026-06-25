import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  calculateReadingTime,
  getAllArticles,
  readArticleFile,
} from "@/lib/mdx";
import { Mdx } from "@/components/mdx/Mdx";
import { Container } from "@/components/site/Container";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { articleJsonLd } from "@/lib/seo";

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

  return (
    <Container>
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

      <div className="mt-8">
        <Mdx source={content} />
      </div>
    </article>
    </Container>
  );
}

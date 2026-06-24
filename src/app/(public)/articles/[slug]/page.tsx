import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  calculateReadingTime,
  getAllArticles,
  readArticleFile,
} from "@/lib/mdx";
import { Mdx } from "@/components/mdx/Mdx";
import { formatDate } from "@/lib/format";

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

  const { title, description, coverImage } = article.frontmatter;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
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

  return (
    <article>
      <Link
        href="/"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back
      </Link>

      <header className="mt-6 border-b border-zinc-200/70 pb-8 dark:border-zinc-800/70">
        <div className="mb-3 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{readingTime} min read</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {frontmatter.title}
        </h1>
        {frontmatter.description && (
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            {frontmatter.description}
          </p>
        )}
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {frontmatter.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="text-sm text-zinc-500 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
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
  );
}

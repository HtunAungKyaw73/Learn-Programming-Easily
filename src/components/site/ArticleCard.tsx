import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { ArticleListItem } from "@/types";

export function ArticleCard({ article }: { article: ArticleListItem }) {
  const { slug, frontmatter, readingTime } = article;
  const date = formatDate(frontmatter.publishedAt);

  return (
    <article className="group border-b border-zinc-200/70 py-8 last:border-0 dark:border-zinc-800/70">
      <Link href={`/articles/${slug}`} className="block">
        <div className="mb-2 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{readingTime} min read</span>
          {frontmatter.featured && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              Featured
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {frontmatter.title}
        </h2>
        {frontmatter.description && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {frontmatter.description}
          </p>
        )}
      </Link>
      {frontmatter.tags && frontmatter.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {frontmatter.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="text-xs text-zinc-500 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

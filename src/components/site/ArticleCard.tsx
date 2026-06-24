import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { ArticleListItem } from "@/types";

export function ArticleCard({ article }: { article: ArticleListItem }) {
  const { slug, frontmatter, readingTime } = article;
  const date = formatDate(frontmatter.publishedAt);
  const kicker = frontmatter.categories?.[0] ?? frontmatter.tags?.[0];

  return (
    <article className="group border-b border-border py-8 last:border-0">
      <Link href={`/articles/${slug}`} className="block">
        {kicker && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-terracotta">
          {frontmatter.title}
        </h2>
        {frontmatter.description && (
          <p className="mt-2 font-prose text-lg leading-relaxed text-muted">
            {frontmatter.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-faint">
          {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{readingTime} min read</span>
          {frontmatter.featured && (
            <span className="rounded-full bg-terracotta/10 px-2 py-0.5 font-medium text-terracotta">
              Featured
            </span>
          )}
        </div>
      </Link>
      {frontmatter.tags && frontmatter.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {frontmatter.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="text-xs text-faint transition-colors hover:text-terracotta"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

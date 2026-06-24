import Link from "next/link";
import type { Metadata } from "next";
import { getAllTags, getArticlesByTag } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse articles by topic.",
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Tags
      </h1>
      <p className="mt-2 text-muted">
        Browse articles by topic.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {tags.length === 0 ? (
          <p className="text-faint">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
            >
              #{tag}
              <span className="ml-2 text-faint">
                {getArticlesByTag(tag).length}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

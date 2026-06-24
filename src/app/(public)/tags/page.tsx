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
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Tags
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Browse articles by topic.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {tags.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
            >
              #{tag}
              <span className="ml-2 text-zinc-400 dark:text-zinc-500">
                {getArticlesByTag(tag).length}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

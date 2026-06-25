import Link from "next/link";
import type { Metadata } from "next";
import { getPublicTagsWithCount } from "@/lib/queries";
import { Container } from "@/components/site/Container";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse articles by topic.",
};

export default async function TagsPage() {
  const tags = await getPublicTagsWithCount();

  return (
    <Container>
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
              key={tag.name}
              href={`/tags/${tag.name}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
            >
              #{tag.name}
              <span className="ml-2 text-faint">
                {tag.count}
              </span>
            </Link>
          ))
        )}
      </div>
    </Container>
  );
}

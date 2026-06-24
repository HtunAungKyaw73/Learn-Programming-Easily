import Fuse from "fuse.js";
import { getAllArticles } from "@/lib/mdx";

export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

/** Build the client search index from visible articles (metadata only). */
export function getSearchDocs(): SearchDoc[] {
  return getAllArticles().map((a) => ({
    slug: a.slug,
    title: a.frontmatter.title,
    description: a.frontmatter.description ?? "",
    tags: a.frontmatter.tags ?? [],
  }));
}

/** Configured Fuse instance: title weighted over tags/description. */
export function createFuse(docs: SearchDoc[]): Fuse<SearchDoc> {
  return new Fuse(docs, {
    keys: [
      { name: "title", weight: 2 },
      { name: "tags", weight: 1 },
      { name: "description", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });
}

/** Ranked results. Empty/whitespace query returns []. */
export function searchDocs(fuse: Fuse<SearchDoc>, query: string): SearchDoc[] {
  const q = query.trim();
  if (!q) return [];
  return fuse.search(q).map((r) => r.item);
}

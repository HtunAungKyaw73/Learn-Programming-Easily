import Fuse from "fuse.js";

// Client-safe: this module is imported by the browser <Search> island, so it
// must NOT pull in server-only code (e.g. the fs-backed MDX reader). The index
// builder that touches the filesystem lives in `search-index.ts`.

export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  tags: string[];
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

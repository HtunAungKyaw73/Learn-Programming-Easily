// Pure helpers: compute which public paths an article/taxonomy mutation must
// revalidate. No `next/cache` import here so this stays unit-testable and free
// of request-context coupling — the server actions do the actual
// `revalidatePath` calls over the returned list.

/** Public surfaces every content change can touch (listings, feed, sitemap). */
const PUBLIC_SURFACES = ["/", "/articles", "/tags", "/rss.xml", "/sitemap.xml"];

function dedupe(paths: string[]): string[] {
  return [...new Set(paths)];
}

/** Paths to revalidate after an article create / edit / delete. */
export function articleRevalidationPaths(slug?: string): string[] {
  return dedupe([
    "/admin",
    "/admin/articles",
    ...PUBLIC_SURFACES,
    ...(slug ? [`/articles/${slug}`] : []),
  ]);
}

/**
 * Paths to revalidate after a tag/category mutation.
 *
 * `tagNames` → each tag's own `/tags/<name>` page (pass both old and new on a
 * rename). `articleSlugs` → every article that referenced the taxonomy term,
 * captured BEFORE the delete/update since the relation is gone afterward.
 */
export function taxonomyRevalidationPaths(opts: {
  tagNames?: string[];
  articleSlugs?: string[];
}): string[] {
  const { tagNames = [], articleSlugs = [] } = opts;
  return dedupe([
    ...PUBLIC_SURFACES,
    ...tagNames.map((name) => `/tags/${name}`),
    ...articleSlugs.map((slug) => `/articles/${slug}`),
  ]);
}

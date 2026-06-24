/**
 * Generate a URL-safe slug from a title string.
 * Kept in a separate file (no fs/path imports) so it can be used in client components.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

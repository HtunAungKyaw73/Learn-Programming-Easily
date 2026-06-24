import { getAllArticles } from "@/lib/mdx";
import type { SearchDoc } from "@/lib/search";

// Server-only: reads MDX files via the filesystem. Imported by the server
// Header to produce the index that is passed as props to the client <Search>.

/** Build the client search index from visible articles (metadata only). */
export function getSearchDocs(): SearchDoc[] {
  return getAllArticles().map((a) => ({
    slug: a.slug,
    title: a.frontmatter.title,
    description: a.frontmatter.description ?? "",
    tags: a.frontmatter.tags ?? [],
  }));
}

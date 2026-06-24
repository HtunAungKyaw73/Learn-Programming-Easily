import { getPublicArticles } from "@/lib/queries";
import type { SearchDoc } from "@/lib/search";

// Server-only: queries published articles from DB. Imported by the server
// Header to produce the index that is passed as props to the client <Search>.

/** Build the client search index from published articles (metadata only). */
export async function getSearchDocs(): Promise<SearchDoc[]> {
  const articles = await getPublicArticles();
  return articles.map((a) => ({
    slug: a.slug,
    title: a.frontmatter.title,
    description: a.frontmatter.description ?? "",
    tags: a.frontmatter.tags ?? [],
  }));
}

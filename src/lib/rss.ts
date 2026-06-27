import { Feed } from "feed";
import { getPublicArticles } from "@/lib/queries";
import { site } from "@/lib/site";

/** Render the public RSS 2.0 feed. Published articles only (DB-filtered). */
export async function buildRssXml(): Promise<string> {
  const feed = new Feed({
    title: site.name,
    description: site.description,
    id: site.url,
    link: site.url,
    language: "en",
    copyright: `© ${new Date().getFullYear()} ${site.author.name}`,
    author: { name: site.author.name },
    feedLinks: { rss2: `${site.url}/rss.xml` },
  });

  for (const article of await getPublicArticles()) {
    const url = `${site.url}/articles/${article.slug}`;
    feed.addItem({
      title: article.frontmatter.title,
      id: url,
      link: url,
      description: article.frontmatter.description ?? "",
      date: article.frontmatter.publishedAt
        ? new Date(article.frontmatter.publishedAt)
        : new Date(0),
      category: (article.frontmatter.tags ?? []).map((name) => ({ name })),
    });
  }

  return feed.rss2();
}

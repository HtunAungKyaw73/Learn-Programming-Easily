import type { MetadataRoute } from "next";
import { getPublicArticles, getPublicTagsWithCount } from "@/lib/queries";
import { buildSitemap } from "@/lib/seo";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, tags] = await Promise.all([
    getPublicArticles(),
    getPublicTagsWithCount(),
  ]);
  return buildSitemap(
    site.url,
    articles.map((a) => ({
      slug: a.slug,
      publishedAt: a.frontmatter.publishedAt,
    })),
    tags.map((t) => ({ name: t.name })),
  );
}

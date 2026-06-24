import type { MetadataRoute } from "next";

export interface SitemapArticle {
  slug: string;
  publishedAt?: string;
}

export interface SitemapTag {
  name: string;
}

/** Static routes + one entry per published article + one per tag. */
export function buildSitemap(
  baseUrl: string,
  articles: SitemapArticle[],
  tags: SitemapTag[],
): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now },
    { url: `${baseUrl}/articles`, lastModified: now },
    { url: `${baseUrl}/tags`, lastModified: now },
  ];
  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/articles/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : undefined,
  }));
  const tagRoutes: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(t.name)}`,
  }));
  return [...staticRoutes, ...articleRoutes, ...tagRoutes];
}

export interface JsonLdInput {
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  tags?: string[];
  coverImage?: string;
  authorName: string;
  baseUrl: string;
}

/** BlogPosting structured data for one article. Omits absent optionals. */
export function articleJsonLd(a: JsonLdInput): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    url: `${a.baseUrl}/articles/${a.slug}`,
    author: { "@type": "Person", name: a.authorName },
  };
  if (a.description) ld.description = a.description;
  if (a.publishedAt) ld.datePublished = a.publishedAt;
  if (a.coverImage) ld.image = a.coverImage;
  if (a.tags && a.tags.length > 0) ld.keywords = a.tags.join(", ");
  return ld;
}

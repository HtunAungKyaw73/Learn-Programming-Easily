import matter from "gray-matter";
import type { ArticleWithContent, ArticleFrontmatter } from "@/types";

/**
 * Serialize an article into a round-trippable Markdown file: YAML frontmatter
 * rebuilt from DB metadata followed by the raw MDX body. The frontmatter shape
 * matches `ArticleFrontmatter`, so the output re-parses cleanly via gray-matter.
 */
export function toMarkdownFile(article: ArticleWithContent): string {
  const frontmatter: ArticleFrontmatter = {
    title: article.title,
    published: article.published,
    featured: article.featured,
  };

  if (article.description) frontmatter.description = article.description;
  if (article.coverImage) frontmatter.coverImage = article.coverImage;
  if (article.publishedAt) {
    frontmatter.publishedAt = article.publishedAt.toISOString().split("T")[0];
  }
  if (article.tags.length > 0) {
    frontmatter.tags = article.tags.map((t) => t.name);
  }
  if (article.categories.length > 0) {
    frontmatter.categories = article.categories.map((c) => c.name);
  }

  return matter.stringify(article.content, frontmatter);
}

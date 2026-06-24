import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ArticleFrontmatter, ArticleListItem } from "@/types";

const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Serialize frontmatter + MDX body to a .mdx file in the content directory.
 * Creates the directory if it doesn't exist.
 */
export function writeArticleFile(
  slug: string,
  frontmatter: ArticleFrontmatter,
  content: string,
): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
  const raw = matter.stringify(content, frontmatter);
  fs.writeFileSync(getArticlePath(slug), raw, "utf-8");
}

/**
 * Delete an MDX file from the content directory. No-op if missing.
 */
export function deleteArticleFile(slug: string): void {
  const filePath = getArticlePath(slug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Calculate estimated reading time in minutes.
 * Average reading speed: ~200 words per minute.
 */
export function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Get the full filesystem path to an MDX file.
 */
export function getArticlePath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

/**
 * Check if an MDX file exists for the given slug.
 */
export function articleFileExists(slug: string): boolean {
  return fs.existsSync(getArticlePath(slug));
}

/**
 * Read and parse an MDX file, returning frontmatter + raw content.
 */
export function readArticleFile(slug: string): {
  frontmatter: ArticleFrontmatter;
  content: string;
  readingTime: number;
} | null {
  const filePath = getArticlePath(slug);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    frontmatter: data as ArticleFrontmatter,
    content,
    readingTime: calculateReadingTime(content),
  };
}

/**
 * List all MDX file slugs in the content directory.
 */
export function listArticleSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

/**
 * Whether an article should be visible on the public site.
 * In development we show everything so drafts are previewable; in production
 * only `published: true` articles are listed.
 */
function isVisible(frontmatter: ArticleFrontmatter): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return frontmatter.published === true;
}

/**
 * Read every MDX file, returning visible articles sorted newest-first by
 * publishedAt (falling back to slug order when a date is missing).
 */
export function getAllArticles(): ArticleListItem[] {
  return listArticleSlugs()
    .map((slug) => {
      const parsed = readArticleFile(slug);
      if (!parsed) return null;
      return {
        slug,
        frontmatter: parsed.frontmatter,
        readingTime: parsed.readingTime,
      } satisfies ArticleListItem;
    })
    .filter((a): a is ArticleListItem => a !== null && isVisible(a.frontmatter))
    .sort((a, b) => {
      const da = a.frontmatter.publishedAt ?? "";
      const db = b.frontmatter.publishedAt ?? "";
      return db.localeCompare(da);
    });
}

/**
 * Featured articles only, preserving the newest-first order.
 */
export function getFeaturedArticles(): ArticleListItem[] {
  return getAllArticles().filter((a) => a.frontmatter.featured);
}

/**
 * Distinct tags across all visible articles, alphabetically sorted.
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const article of getAllArticles()) {
    for (const tag of article.frontmatter.tags ?? []) tags.add(tag);
  }
  return [...tags].sort();
}

/**
 * Visible articles that carry the given tag.
 */
export function getArticlesByTag(tag: string): ArticleListItem[] {
  return getAllArticles().filter((a) => a.frontmatter.tags?.includes(tag));
}

// slugify is now in @/lib/slug (client-safe, no fs imports)

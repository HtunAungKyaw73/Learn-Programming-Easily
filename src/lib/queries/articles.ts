import { prisma } from "@/lib/prisma";
import { readArticleFile } from "@/lib/mdx";
import type {
  AdminArticleListItem,
  ArticleListItem,
  ArticleWithContent,
} from "@/types";

type ArticleFilter = "all" | "published" | "drafts";

/**
 * Admin listing: all articles from DB with tag/category relations.
 */
export async function getAdminArticles(
  filter: ArticleFilter = "all",
): Promise<AdminArticleListItem[]> {
  const where =
    filter === "published"
      ? { published: true }
      : filter === "drafts"
        ? { published: false }
        : {};

  return prisma.article.findMany({
    where,
    include: {
      tags: { select: { id: true, name: true, slug: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Admin edit: DB metadata + MDX body from disk.
 */
export async function getAdminArticleBySlug(
  slug: string,
): Promise<ArticleWithContent | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      tags: { select: { id: true, name: true, slug: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!article) return null;

  const mdx = readArticleFile(slug);
  if (!mdx) return null;

  return {
    ...article,
    content: mdx.content,
  };
}

/**
 * Dashboard stats: total, published, draft counts.
 */
export async function getArticleStats(): Promise<{
  total: number;
  published: number;
  drafts: number;
}> {
  const [total, published] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { published: true } }),
  ]);
  return { total, published, drafts: total - published };
}

/**
 * Public listing: published articles transformed to ArticleListItem shape.
 * Keeps the same interface as the filesystem-based getAllArticles().
 */
export async function getPublicArticles(): Promise<ArticleListItem[]> {
  const articles = await prisma.article.findMany({
    where: { published: true },
    include: {
      tags: { select: { name: true } },
      categories: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  return articles.map((a) => ({
    slug: a.slug,
    frontmatter: {
      title: a.title,
      description: a.description ?? undefined,
      tags: a.tags.map((t) => t.name),
      categories: a.categories.map((c) => c.name),
      published: a.published,
      featured: a.featured,
      publishedAt: a.publishedAt?.toISOString() ?? undefined,
      coverImage: a.coverImage ?? undefined,
    },
    readingTime: a.readingTime ?? 1,
  }));
}

/**
 * Public tag filter: published articles with the given tag.
 */
export async function getPublicArticlesByTag(
  tag: string,
): Promise<ArticleListItem[]> {
  const articles = await prisma.article.findMany({
    where: {
      published: true,
      tags: { some: { name: tag } },
    },
    include: {
      tags: { select: { name: true } },
      categories: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  return articles.map((a) => ({
    slug: a.slug,
    frontmatter: {
      title: a.title,
      description: a.description ?? undefined,
      tags: a.tags.map((t) => t.name),
      categories: a.categories.map((c) => c.name),
      published: a.published,
      featured: a.featured,
      publishedAt: a.publishedAt?.toISOString() ?? undefined,
      coverImage: a.coverImage ?? undefined,
    },
    readingTime: a.readingTime ?? 1,
  }));
}

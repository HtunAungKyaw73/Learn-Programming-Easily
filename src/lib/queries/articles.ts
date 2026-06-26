import { prisma } from "@/lib/prisma";
import type {
  AdminArticleListItem,
  ArticleListItem,
  ArticleWithContent,
} from "@/types";

const articleInclude = {
  tags: { select: { id: true, name: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
} as const;

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
 * Public article: published-only, body mapped to content.
 */
export async function getPublicArticleBySlug(
  slug: string,
): Promise<ArticleWithContent | null> {
  const article = await prisma.article.findFirst({
    where: { slug, published: true },
    include: articleInclude,
  });
  if (!article) return null;
  const { body, ...rest } = article;
  return { ...rest, content: body };
}

/**
 * Published slugs for generateStaticParams.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await prisma.article.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/**
 * Admin edit: DB metadata + body from DB column.
 */
export async function getAdminArticleBySlug(
  slug: string,
): Promise<ArticleWithContent | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: articleInclude,
  });
  if (!article) return null;
  const { body, ...rest } = article;
  return { ...rest, content: body };
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
 * Public listing of published articles as ArticleListItem.
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

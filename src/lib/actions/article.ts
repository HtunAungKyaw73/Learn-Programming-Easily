"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { writeArticleFile, deleteArticleFile } from "@/lib/mdx";
import { requireAuth } from "./auth-guard";
import type { ArticleFrontmatter } from "@/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ActionResult = { ok: true } | { ok: false; error: string };

interface ArticleFormData {
  title: string;
  slug: string;
  description: string;
  content: string;
  published: boolean;
  featured: boolean;
  publishedAt: string; // ISO date string or empty
  coverImage: string;
  tagNames: string[];
  categoryNames: string[];
}

/**
 * Upsert tags/categories by name and return Prisma connect objects.
 */
async function upsertTags(names: string[]) {
  const results = [];
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name, slug: slugify(name) },
      update: {},
    });
    results.push({ id: tag.id });
  }
  return results;
}

async function upsertCategories(names: string[]) {
  const results = [];
  for (const name of names) {
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name, slug: slugify(name) },
      update: {},
    });
    results.push({ id: cat.id });
  }
  return results;
}

/**
 * Build frontmatter object from form data for MDX serialization.
 */
function toFrontmatter(data: ArticleFormData): ArticleFrontmatter {
  return {
    title: data.title,
    description: data.description || undefined,
    tags: data.tagNames.length > 0 ? data.tagNames : undefined,
    categories: data.categoryNames.length > 0 ? data.categoryNames : undefined,
    published: data.published || undefined,
    featured: data.featured || undefined,
    publishedAt: data.publishedAt || undefined,
    coverImage: data.coverImage || undefined,
  };
}

export async function createArticle(data: ArticleFormData): Promise<ActionResult> {
  await requireAuth();

  const slug = data.slug || slugify(data.title);
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug must be lowercase, alphanumeric with hyphens only." };
  }

  // Check uniqueness in DB
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `An article with slug "${slug}" already exists.` };
  }

  try {
    const frontmatter = toFrontmatter(data);
    writeArticleFile(slug, frontmatter, data.content);

    const readingTime = Math.max(
      1,
      Math.ceil(data.content.trim().split(/\s+/).length / 200),
    );

    await prisma.article.create({
      data: {
        slug,
        title: data.title,
        description: data.description || null,
        published: data.published,
        featured: data.featured,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        coverImage: data.coverImage || null,
        readingTime,
        tags: { connect: await upsertTags(data.tagNames) },
        categories: { connect: await upsertCategories(data.categoryNames) },
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath("/tags");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to create article: ${String(err)}` };
  }
}

export async function updateArticle(
  originalSlug: string,
  data: ArticleFormData,
): Promise<ActionResult> {
  await requireAuth();

  const slug = data.slug || slugify(data.title);
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug must be lowercase, alphanumeric with hyphens only." };
  }

  // If slug changed, check uniqueness
  if (slug !== originalSlug) {
    const conflict = await prisma.article.findUnique({ where: { slug } });
    if (conflict) {
      return { ok: false, error: `An article with slug "${slug}" already exists.` };
    }
  }

  try {
    // Rewrite MDX file
    const frontmatter = toFrontmatter(data);
    if (slug !== originalSlug) {
      deleteArticleFile(originalSlug);
    }
    writeArticleFile(slug, frontmatter, data.content);

    const readingTime = Math.max(
      1,
      Math.ceil(data.content.trim().split(/\s+/).length / 200),
    );

    // Diff tags
    const currentArticle = await prisma.article.findUnique({
      where: { slug: originalSlug },
      include: { tags: { select: { name: true } }, categories: { select: { name: true } } },
    });
    if (!currentArticle) {
      return { ok: false, error: "Article not found." };
    }

    const currentTagNames = currentArticle.tags.map((t) => t.name);
    const toConnectTags = data.tagNames.filter((n) => !currentTagNames.includes(n));
    const toDisconnectTags = currentTagNames.filter((n) => !data.tagNames.includes(n));

    const currentCatNames = currentArticle.categories.map((c) => c.name);
    const toConnectCats = data.categoryNames.filter((n) => !currentCatNames.includes(n));
    const toDisconnectCats = currentCatNames.filter((n) => !data.categoryNames.includes(n));

    await prisma.article.update({
      where: { slug: originalSlug },
      data: {
        slug,
        title: data.title,
        description: data.description || null,
        published: data.published,
        featured: data.featured,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        coverImage: data.coverImage || null,
        readingTime,
        tags: {
          connect: await upsertTags(toConnectTags),
          disconnect: toDisconnectTags.map((name) => ({ name })),
        },
        categories: {
          connect: await upsertCategories(toConnectCats),
          disconnect: toDisconnectCats.map((name) => ({ name })),
        },
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath("/tags");
    revalidatePath(`/articles/${slug}`);
    if (slug !== originalSlug) revalidatePath(`/articles/${originalSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update article: ${String(err)}` };
  }
}

export async function deleteArticle(slug: string): Promise<ActionResult> {
  await requireAuth();

  try {
    deleteArticleFile(slug);
    await prisma.article.delete({ where: { slug } });

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath("/tags");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete article: ${String(err)}` };
  }
}

export async function togglePublished(slug: string): Promise<ActionResult> {
  await requireAuth();

  try {
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return { ok: false, error: "Article not found." };

    const newPublished = !article.published;
    await prisma.article.update({
      where: { slug },
      data: { published: newPublished },
    });

    // Sync frontmatter
    const mdx = (await import("@/lib/mdx")).readArticleFile(slug);
    if (mdx) {
      writeArticleFile(slug, { ...mdx.frontmatter, published: newPublished }, mdx.content);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/");
    revalidatePath("/articles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to toggle publish: ${String(err)}` };
  }
}

export async function toggleFeatured(slug: string): Promise<ActionResult> {
  await requireAuth();

  try {
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return { ok: false, error: "Article not found." };

    const newFeatured = !article.featured;
    await prisma.article.update({
      where: { slug },
      data: { featured: newFeatured },
    });

    // Sync frontmatter
    const mdx = (await import("@/lib/mdx")).readArticleFile(slug);
    if (mdx) {
      writeArticleFile(slug, { ...mdx.frontmatter, featured: newFeatured }, mdx.content);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to toggle featured: ${String(err)}` };
  }
}

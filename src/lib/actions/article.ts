"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { calculateReadingTime } from "@/lib/mdx";
import { requireAuth } from "./auth-guard";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ActionResult = { ok: true } | { ok: false; error: string };

/** Revalidate every public surface an article change can affect. */
function revalidatePublicSurfaces(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/tags");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/articles/${slug}`);
}

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
    const readingTime = calculateReadingTime(data.content);

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
        body: data.content,
        tags: { connect: await upsertTags(data.tagNames) },
        categories: { connect: await upsertCategories(data.categoryNames) },
      },
    });

    revalidatePublicSurfaces(slug);
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
    const readingTime = calculateReadingTime(data.content);

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
        body: data.content,
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

    revalidatePublicSurfaces(slug);
    if (slug !== originalSlug) revalidatePath(`/articles/${originalSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update article: ${String(err)}` };
  }
}

export async function deleteArticle(slug: string): Promise<ActionResult> {
  await requireAuth();

  try {
    await prisma.article.delete({ where: { slug } });

    revalidatePublicSurfaces(slug);
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

    revalidatePublicSurfaces(slug);
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

    revalidatePublicSurfaces(slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to toggle featured: ${String(err)}` };
  }
}

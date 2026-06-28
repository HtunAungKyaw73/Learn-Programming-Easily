"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { taxonomyRevalidationPaths } from "@/lib/revalidate-paths";
import { requireAuth } from "./auth-guard";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Revalidate the admin category list plus the public surfaces a category
 * change hits. Categories have no public `/categories/<name>` page, but they
 * appear on article pages and per-article OG images, so refresh those.
 */
function revalidateCategoryChange(articleSlugs: string[] = []) {
  revalidatePath("/admin/categories");
  for (const path of taxonomyRevalidationPaths({ articleSlugs })) {
    revalidatePath(path);
  }
}

export async function createCategory(name: string): Promise<ActionResult> {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Category name cannot be empty." };

  const existing = await prisma.category.findUnique({
    where: { name: trimmed },
  });
  if (existing)
    return { ok: false, error: `Category "${trimmed}" already exists.` };

  try {
    await prisma.category.create({
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidateCategoryChange();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to create category: ${String(err)}` };
  }
}

export async function updateCategory(
  id: number,
  name: string,
): Promise<ActionResult> {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Category name cannot be empty." };

  const existing = await prisma.category.findUnique({
    where: { name: trimmed },
  });
  if (existing && existing.id !== id) {
    return { ok: false, error: `Category "${trimmed}" already exists.` };
  }

  // Capture affected articles before the rename to refresh their pages/OG.
  const current = await prisma.category.findUnique({
    where: { id },
    include: { articles: { select: { slug: true } } },
  });
  if (!current) return { ok: false, error: "Category not found." };

  try {
    await prisma.category.update({
      where: { id },
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidateCategoryChange(current.articles.map((a) => a.slug));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update category: ${String(err)}` };
  }
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireAuth();

  // Capture tagged articles before deleting — the relation is gone afterward.
  const category = await prisma.category.findUnique({
    where: { id },
    include: { articles: { select: { slug: true } } },
  });
  if (!category) return { ok: false, error: "Category not found." };

  try {
    await prisma.category.delete({ where: { id } });
    revalidateCategoryChange(category.articles.map((a) => a.slug));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete category: ${String(err)}` };
  }
}

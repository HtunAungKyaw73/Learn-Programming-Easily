import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { AdminTagItem } from "@/types";

/**
 * Admin listing: all categories with article count.
 */
export async function getAdminCategories(): Promise<AdminTagItem[]> {
  return prisma.category.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a category with auto-generated slug.
 */
export async function createCategory(name: string) {
  return prisma.category.create({
    data: { name, slug: slugify(name) },
  });
}

/**
 * Update a category's name (and regenerate slug).
 */
export async function updateCategory(id: number, name: string) {
  return prisma.category.update({
    where: { id },
    data: { name, slug: slugify(name) },
  });
}

/**
 * Delete a category. Prisma M2M disconnect is automatic.
 */
export async function deleteCategory(id: number) {
  return prisma.category.delete({ where: { id } });
}

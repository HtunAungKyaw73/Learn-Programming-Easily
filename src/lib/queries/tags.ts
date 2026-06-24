import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { AdminTagItem } from "@/types";

/**
 * Admin listing: all tags with article count.
 */
export async function getAdminTags(): Promise<AdminTagItem[]> {
  return prisma.tag.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a tag with auto-generated slug.
 */
export async function createTag(name: string) {
  return prisma.tag.create({
    data: { name, slug: slugify(name) },
  });
}

/**
 * Update a tag's name (and regenerate slug).
 */
export async function updateTag(id: number, name: string) {
  return prisma.tag.update({
    where: { id },
    data: { name, slug: slugify(name) },
  });
}

/**
 * Delete a tag. Prisma M2M disconnect is automatic.
 */
export async function deleteTag(id: number) {
  return prisma.tag.delete({ where: { id } });
}

/**
 * Public: all tags with article count (published articles only).
 */
export async function getPublicTagsWithCount(): Promise<
  { name: string; slug: string; count: number }[]
> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          articles: { where: { published: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    count: t._count.articles,
  }));
}

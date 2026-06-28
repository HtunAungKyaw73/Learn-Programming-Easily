"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { taxonomyRevalidationPaths } from "@/lib/revalidate-paths";
import { requireAuth } from "./auth-guard";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Revalidate the admin tag list plus every public surface a tag change hits. */
function revalidateTagChange(opts: {
  tagNames?: string[];
  articleSlugs?: string[];
}) {
  revalidatePath("/admin/tags");
  for (const path of taxonomyRevalidationPaths(opts)) revalidatePath(path);
}

export async function createTag(name: string): Promise<ActionResult> {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Tag name cannot be empty." };

  const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
  if (existing) return { ok: false, error: `Tag "${trimmed}" already exists.` };

  try {
    await prisma.tag.create({
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidateTagChange({ tagNames: [trimmed] });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to create tag: ${String(err)}` };
  }
}

export async function updateTag(
  id: number,
  name: string,
): Promise<ActionResult> {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Tag name cannot be empty." };

  const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
  if (existing && existing.id !== id) {
    return { ok: false, error: `Tag "${trimmed}" already exists.` };
  }

  // Capture the old name + affected articles BEFORE the rename so we can
  // revalidate both the old and new /tags/<name> pages and every article chip.
  const current = await prisma.tag.findUnique({
    where: { id },
    include: { articles: { select: { slug: true } } },
  });
  if (!current) return { ok: false, error: "Tag not found." };

  try {
    await prisma.tag.update({
      where: { id },
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidateTagChange({
      tagNames: [current.name, trimmed],
      articleSlugs: current.articles.map((a) => a.slug),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update tag: ${String(err)}` };
  }
}

export async function deleteTag(id: number): Promise<ActionResult> {
  await requireAuth();

  // Capture the name + tagged articles BEFORE deleting — the M2M relation is
  // gone afterward, so this is the only chance to learn which pages to refresh.
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { articles: { select: { slug: true } } },
  });
  if (!tag) return { ok: false, error: "Tag not found." };

  try {
    await prisma.tag.delete({ where: { id } });
    revalidateTagChange({
      tagNames: [tag.name],
      articleSlugs: tag.articles.map((a) => a.slug),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete tag: ${String(err)}` };
  }
}

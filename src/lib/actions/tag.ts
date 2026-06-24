"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAuth } from "./auth-guard";

type ActionResult = { ok: true } | { ok: false; error: string };

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
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
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

  try {
    await prisma.tag.update({
      where: { id },
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update tag: ${String(err)}` };
  }
}

export async function deleteTag(id: number): Promise<ActionResult> {
  await requireAuth();

  try {
    await prisma.tag.delete({ where: { id } });
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete tag: ${String(err)}` };
  }
}

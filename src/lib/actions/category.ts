"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAuth } from "./auth-guard";

type ActionResult = { ok: true } | { ok: false; error: string };

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
    revalidatePath("/admin/categories");
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

  try {
    await prisma.category.update({
      where: { id },
      data: { name: trimmed, slug: slugify(trimmed) },
    });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to update category: ${String(err)}` };
  }
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireAuth();

  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete category: ${String(err)}` };
  }
}

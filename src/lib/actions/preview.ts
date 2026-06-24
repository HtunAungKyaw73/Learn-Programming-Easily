"use server";

import matter from "gray-matter";
import { requireAuth } from "./auth-guard";

/**
 * Parse raw MDX content (which may include frontmatter) and return the
 * body-only string for preview rendering. Frontmatter is stripped because
 * it's already shown in the form fields.
 */
export async function renderMdxPreview(
  content: string,
): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  await requireAuth();

  try {
    const { content: body } = matter(content);
    return { ok: true, body };
  } catch (err) {
    return { ok: false, error: `Failed to parse MDX: ${String(err)}` };
  }
}

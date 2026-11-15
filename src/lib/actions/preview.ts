"use server";

import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { mdxOptions } from "@/lib/mdx-options";
import { requireAuth } from "./auth-guard";

/**
 * Compile raw MDX content (which may include frontmatter) into a serialized
 * source the admin preview can render with the *client* `<MDXRemote>`. All the
 * heavy lifting — MDX compilation and Shiki highlighting — happens here on the
 * server, so the editor never pulls Shiki into the browser bundle and never
 * mounts an async server component inside the client form (which previously
 * suspended a page-level boundary and flashed a full reload on every preview).
 *
 * Frontmatter is stripped because it's already shown in the form fields. The
 * plugin pipeline is the shared `mdxOptions`, the same object the published
 * article renders with, so the preview matches it exactly.
 */
export async function renderMdxPreview(
  content: string,
): Promise<
  { ok: true; source: MDXRemoteSerializeResult } | { ok: false; error: string }
> {
  await requireAuth();

  try {
    const { content: body } = matter(content);
    const source = await serialize(body, { mdxOptions });
    return { ok: true, source };
  } catch (err) {
    return { ok: false, error: `Failed to parse MDX: ${String(err)}` };
  }
}

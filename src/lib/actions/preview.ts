"use server";

import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
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
 * rehype pipeline mirrors `components/mdx/Mdx.tsx` so the preview matches the
 * published article exactly.
 */
export async function renderMdxPreview(
  content: string,
): Promise<
  { ok: true; source: MDXRemoteSerializeResult } | { ok: false; error: string }
> {
  await requireAuth();

  try {
    const { content: body } = matter(content);
    const source = await serialize(body, {
      mdxOptions: {
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeShiki,
            {
              themes: { light: "github-light", dark: "github-dark" },
              transformers: [
                transformerNotationDiff(),
                transformerNotationHighlight(),
              ],
            },
          ],
        ],
      },
    });
    return { ok: true, source };
  } catch (err) {
    return { ok: false, error: `Failed to parse MDX: ${String(err)}` };
  }
}

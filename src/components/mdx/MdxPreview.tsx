"use client";

import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import { mdxComponents } from "./mdx-components";

/**
 * Client-side MDX renderer for the admin preview. It hydrates already-compiled
 * source from the `renderMdxPreview` server action with no further server
 * round-trip — a plain synchronous client component, so toggling or updating
 * the preview never suspends a page-level boundary the way the async server
 * `<Mdx>` renderer did.
 */
export function MdxPreview({ source }: { source: MDXRemoteSerializeResult }) {
  return (
    <div className="prose max-w-none">
      <MDXRemote {...source} components={mdxComponents} />
    </div>
  );
}

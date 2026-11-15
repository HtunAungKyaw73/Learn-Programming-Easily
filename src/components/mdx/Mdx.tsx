import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxOptions } from "@/lib/mdx-options";
import { mdxComponents } from "./mdx-components";

/**
 * Server-rendered MDX article body. The plugin pipeline (GFM, Mermaid blocks,
 * heading slugs, Shiki highlighting) lives in `lib/mdx-options.ts`, shared
 * with the admin preview.
 */
export function Mdx({ source }: { source: string }) {
  return (
    <div className="prose max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{ mdxOptions }}
      />
    </div>
  );
}

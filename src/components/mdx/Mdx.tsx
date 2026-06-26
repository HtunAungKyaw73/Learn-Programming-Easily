import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "./mdx-components";

/**
 * Server-rendered MDX article body. Code blocks are highlighted at build/render
 * time by Shiki with a light+dark dual theme (CSS-variable based, switched by
 * the `prefers-color-scheme` rules in globals.css).
 */
export function Mdx({ source }: { source: string }) {
  return (
    <div className="prose max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
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
        }}
      />
    </div>
  );
}

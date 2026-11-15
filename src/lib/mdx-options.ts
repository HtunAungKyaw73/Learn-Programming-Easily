import type { serialize } from "next-mdx-remote/serialize";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import { remarkMermaid } from "./remark-mermaid";

// next-mdx-remote doesn't export its options type; derive it from `serialize`.
type MdxOptions = NonNullable<
  NonNullable<Parameters<typeof serialize>[1]>["mdxOptions"]
>;

/**
 * The one MDX plugin pipeline. Both renderers import it — the public RSC
 * `<Mdx>` and the admin preview's `renderMdxPreview` — so a published article
 * and its preview can't drift apart.
 *
 * Order matters: `remarkMermaid` rewrites ```mermaid blocks on the markdown
 * tree, so by the time Shiki runs on the HTML tree they are no longer code.
 * Shiki uses a light+dark dual theme (CSS-variable based, switched by the
 * `.dark` rules in globals.css).
 */
export const mdxOptions: MdxOptions = {
  remarkPlugins: [remarkGfm, remarkMermaid],
  rehypePlugins: [
    rehypeSlug,
    [
      rehypeShiki,
      {
        themes: { light: "github-light", dark: "github-dark" },
        transformers: [transformerNotationDiff(), transformerNotationHighlight()],
      },
    ],
  ],
};

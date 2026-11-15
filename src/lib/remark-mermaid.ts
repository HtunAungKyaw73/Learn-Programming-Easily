// Remark plugin: turn ```mermaid fenced blocks into <Mermaid chart="…" />.
//
// It runs on the markdown tree, before rehype, so Shiki never sees the block
// (it has no `mermaid` grammar and would print the source as plain code). The
// `Mermaid` name is resolved from `mdxComponents` at render time.

/** The slice of an mdast node this plugin reads or writes. */
export interface MdastNode {
  type: string;
  children?: MdastNode[];
  /** `code`: the info string's language, e.g. "mermaid". */
  lang?: string | null;
  /** `code`: the block's text. On an MDX JSX attribute: its string value. */
  value?: string;
  /** `mdxJsxFlowElement` / `mdxJsxAttribute`: element or attribute name. */
  name?: string;
  attributes?: MdastNode[];
}

const MERMAID_LANG = "mermaid";

function toMermaidElement(source: string): MdastNode {
  return {
    type: "mdxJsxFlowElement",
    name: "Mermaid",
    // A plain string attribute, not an expression: the source is carried as
    // data and never evaluated as JavaScript.
    attributes: [{ type: "mdxJsxAttribute", name: "chart", value: source }],
    children: [],
  };
}

function transform(node: MdastNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === "code" && child.lang === MERMAID_LANG) {
      return toMermaidElement(child.value ?? "");
    }
    transform(child);
    return child;
  });
}

export function remarkMermaid() {
  return (tree: MdastNode): void => transform(tree);
}

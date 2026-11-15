import { describe, it, expect } from "vitest";
import { remarkMermaid, type MdastNode } from "./remark-mermaid";

const code = (lang: string | null, value: string): MdastNode => ({
  type: "code",
  lang,
  value,
});

const root = (...children: MdastNode[]): MdastNode => ({ type: "root", children });

function run(tree: MdastNode): MdastNode {
  remarkMermaid()(tree);
  return tree;
}

describe("remarkMermaid", () => {
  it("converts a mermaid code block into a Mermaid element", () => {
    const tree = run(root(code("mermaid", "flowchart LR\n  A --> B")));

    expect(tree.children).toEqual([
      {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          { type: "mdxJsxAttribute", name: "chart", value: "flowchart LR\n  A --> B" },
        ],
        children: [],
      },
    ]);
  });

  it("keeps the diagram source byte-for-byte", () => {
    // Labels use HTML, quotes, braces and backticks; none may be altered on
    // the way to the component.
    const source =
      'flowchart LR\n  A["Working directory<br/><i>the files you edit</i>"] -->|git add| B{"`code`"}';
    const tree = run(root(code("mermaid", source)));

    expect(tree.children?.[0].attributes?.[0].value).toBe(source);
  });

  it("leaves code blocks in other languages untouched", () => {
    const blocks = [code("ts", "const a = 1"), code(null, "plain"), code("Mermaid", "A --> B")];
    const tree = run(root(...blocks.map((b) => ({ ...b }))));

    expect(tree.children).toEqual(blocks);
  });

  it("converts a block nested inside a list or blockquote", () => {
    const tree = run(
      root({
        type: "blockquote",
        children: [
          {
            type: "list",
            children: [{ type: "listItem", children: [code("mermaid", "A --> B")] }],
          },
        ],
      }),
    );

    const nested = tree.children?.[0].children?.[0].children?.[0].children?.[0];
    expect(nested?.type).toBe("mdxJsxFlowElement");
    expect(nested?.name).toBe("Mermaid");
  });
});

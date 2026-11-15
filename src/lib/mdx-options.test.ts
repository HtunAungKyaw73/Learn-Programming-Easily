import { describe, it, expect, vi } from "vitest";
import { serialize } from "next-mdx-remote/serialize";
import { mdxOptions } from "./mdx-options";

// The first compile loads Shiki's grammars and themes, which takes a few
// seconds and timed out at the 5s default whenever the machine was busy.
vi.setConfig({ testTimeout: 30_000 });

async function compile(source: string): Promise<string> {
  const { compiledSource } = await serialize(source, { mdxOptions });
  return compiledSource;
}

const MERMAID = [
  "```mermaid",
  "flowchart LR",
  '    A["Working directory<br/><i>the files you edit</i>"] -->|git add| B["Staging area"]',
  "```",
].join("\n");

describe("mdxOptions pipeline", () => {
  it("compiles a mermaid block to a Mermaid component call carrying the source", async () => {
    const out = await compile(MERMAID);

    expect(out).toContain("Mermaid");
    // The label text survives compilation unaltered (quotes are JS-escaped in
    // the compiled string, so assert on a quote-free slice).
    expect(out).toContain("Working directory<br/><i>the files you edit</i>");
    expect(out).toContain("-->|git add|");
    // Shiki must not have highlighted it as a code block.
    expect(out).not.toContain("shiki");
  });

  it("still highlights other code blocks with Shiki", async () => {
    const out = await compile("```ts\nconst a = 1;\n```");

    expect(out).toContain("shiki");
    expect(out).not.toContain("Mermaid");
  });

  it("renders GFM tables", async () => {
    const out = await compile("| a | b |\n| - | - |\n| 1 | 2 |");

    expect(out).toContain("table");
    expect(out).toContain("thead");
  });
});

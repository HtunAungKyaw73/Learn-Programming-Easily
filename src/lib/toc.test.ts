import { describe, it, expect } from "vitest";
import { extractToc } from "@/lib/toc";

describe("extractToc", () => {
  it("extracts h2 and h3 with depth, text and slug id, skipping h1", () => {
    const toc = extractToc("# Title\n\n## First\n\ntext\n\n### Nested\n\n## Second");
    expect(toc).toEqual([
      { depth: 2, text: "First", id: "first" },
      { depth: 3, text: "Nested", id: "nested" },
      { depth: 2, text: "Second", id: "second" },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const toc = extractToc("## Real\n\n```\n## Fake\n```\n\n## AlsoReal");
    expect(toc.map((t) => t.text)).toEqual(["Real", "AlsoReal"]);
  });

  it("strips inline markdown before slugging", () => {
    const toc = extractToc("## The `useState` hook");
    expect(toc[0]).toEqual({
      depth: 2,
      text: "The useState hook",
      id: "the-usestate-hook",
    });
  });

  it("matches rehype-slug duplicate suffixes", () => {
    const toc = extractToc("## Setup\n\n## Setup");
    expect(toc.map((t) => t.id)).toEqual(["setup", "setup-1"]);
  });

  it("returns [] when there are no h2/h3 headings", () => {
    expect(extractToc("# Only a title\n\nbody text")).toEqual([]);
  });
});

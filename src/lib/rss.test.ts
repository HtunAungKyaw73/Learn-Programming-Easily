import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mdx", () => ({ getAllArticles: vi.fn() }));

import { getAllArticles } from "@/lib/mdx";
import { buildRssXml } from "@/lib/rss";

beforeEach(() => vi.mocked(getAllArticles).mockReset());

describe("buildRssXml", () => {
  it("includes published articles and is well-formed RSS", () => {
    vi.mocked(getAllArticles).mockReturnValue([
      {
        slug: "hello-world",
        readingTime: 1,
        frontmatter: {
          title: "Hello World",
          description: "Intro",
          published: true,
          publishedAt: "2026-06-24",
          tags: ["meta"],
        },
      },
    ]);
    const xml = buildRssXml();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("Hello World");
    expect(xml).toContain("/articles/hello-world");
  });

  it("excludes drafts even outside production", () => {
    vi.mocked(getAllArticles).mockReturnValue([
      {
        slug: "draft",
        readingTime: 1,
        frontmatter: { title: "Secret Draft", published: false },
      },
      {
        slug: "live",
        readingTime: 1,
        frontmatter: { title: "Live Post", published: true },
      },
    ]);
    const xml = buildRssXml();
    expect(xml).toContain("Live Post");
    expect(xml).not.toContain("Secret Draft");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries", () => ({ getPublicArticles: vi.fn() }));

import { getPublicArticles } from "@/lib/queries";
import { buildRssXml } from "@/lib/rss";

const getPublic = vi.mocked(getPublicArticles);

beforeEach(() => getPublic.mockReset());

describe("buildRssXml", () => {
  it("includes returned articles and is well-formed RSS", async () => {
    getPublic.mockResolvedValue([
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
    const xml = await buildRssXml();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("Hello World");
    expect(xml).toContain("/articles/hello-world");
  });

  it("renders an empty channel when there are no published articles", async () => {
    getPublic.mockResolvedValue([]);
    const xml = await buildRssXml();
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});

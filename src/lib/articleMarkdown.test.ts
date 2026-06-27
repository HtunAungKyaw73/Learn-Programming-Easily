import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { toMarkdownFile } from "./articleMarkdown";
import type { ArticleWithContent } from "@/types";

function makeArticle(
  overrides: Partial<ArticleWithContent> = {},
): ArticleWithContent {
  return {
    slug: "hello-world",
    title: "Hello World",
    description: "A greeting",
    published: true,
    featured: false,
    publishedAt: new Date("2026-06-27T10:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    readingTime: 3,
    coverImage: "https://example.com/c.png",
    tags: [
      { id: 1, name: "react", slug: "react" },
      { id: 2, name: "next", slug: "next" },
    ],
    categories: [{ id: 1, name: "Frontend", slug: "frontend" }],
    content: "# Hello\n\nBody text.",
    ...overrides,
  };
}

describe("toMarkdownFile", () => {
  it("writes frontmatter from metadata and preserves the body", () => {
    const md = toMarkdownFile(makeArticle());
    const parsed = matter(md);

    expect(parsed.content.trim()).toBe("# Hello\n\nBody text.");
    expect(parsed.data.title).toBe("Hello World");
    expect(parsed.data.description).toBe("A greeting");
    expect(parsed.data.tags).toEqual(["react", "next"]);
    expect(parsed.data.categories).toEqual(["Frontend"]);
    expect(parsed.data.published).toBe(true);
    expect(parsed.data.featured).toBe(false);
    expect(parsed.data.coverImage).toBe("https://example.com/c.png");
  });

  it("formats publishedAt as a YYYY-MM-DD string", () => {
    const md = toMarkdownFile(makeArticle());
    const parsed = matter(md);
    expect(parsed.data.publishedAt).toBe("2026-06-27");
  });

  it("omits null and empty optional fields", () => {
    const md = toMarkdownFile(
      makeArticle({
        description: null,
        coverImage: null,
        publishedAt: null,
        tags: [],
        categories: [],
      }),
    );
    const parsed = matter(md);

    expect(parsed.data).not.toHaveProperty("description");
    expect(parsed.data).not.toHaveProperty("coverImage");
    expect(parsed.data).not.toHaveProperty("publishedAt");
    expect(parsed.data).not.toHaveProperty("tags");
    expect(parsed.data).not.toHaveProperty("categories");
    // Required fields still present.
    expect(parsed.data.title).toBe("Hello World");
  });
});

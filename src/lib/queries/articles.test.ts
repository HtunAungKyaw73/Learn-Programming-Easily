import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getPublicArticleBySlug,
  getPublishedSlugs,
} from "@/lib/queries/articles";

const findFirst = vi.mocked(prisma.article.findFirst);
const findMany = vi.mocked(prisma.article.findMany);

const row = {
  id: 1,
  slug: "hello-world",
  title: "Hello World",
  description: "Intro",
  published: true,
  featured: false,
  publishedAt: new Date("2026-06-24"),
  createdAt: new Date("2026-06-24"),
  updatedAt: new Date("2026-06-24"),
  readingTime: 1,
  coverImage: null,
  body: "# Hello\n\nBody text.",
  tags: [{ id: 1, name: "meta", slug: "meta" }],
  categories: [{ id: 1, name: "general", slug: "general" }],
};

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset();
});

describe("getPublicArticleBySlug", () => {
  it("maps body to content and queries published only", async () => {
    findFirst.mockResolvedValue(row as never);
    const result = await getPublicArticleBySlug("hello-world");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "hello-world", published: true } }),
    );
    expect(result?.content).toBe("# Hello\n\nBody text.");
    expect(result).not.toHaveProperty("body");
    expect(result?.title).toBe("Hello World");
  });

  it("returns null when not found", async () => {
    findFirst.mockResolvedValue(null as never);
    expect(await getPublicArticleBySlug("missing")).toBeNull();
  });
});

describe("getPublishedSlugs", () => {
  it("returns slug strings for published articles", async () => {
    findMany.mockResolvedValue([{ slug: "a" }, { slug: "b" }] as never);
    expect(await getPublishedSlugs()).toEqual(["a", "b"]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true }, select: { slug: true } }),
    );
  });
});

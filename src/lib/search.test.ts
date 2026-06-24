import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries", () => ({
  getPublicArticles: vi.fn(),
}));

import { getPublicArticles } from "@/lib/queries";
import { createFuse, searchDocs } from "@/lib/search";
import { getSearchDocs } from "@/lib/search-index";

const article = (over: Record<string, unknown> = {}) => ({
  slug: "a",
  readingTime: 1,
  frontmatter: { title: "Title", ...over },
});

beforeEach(() => {
  vi.mocked(getPublicArticles).mockReset();
});

describe("getSearchDocs", () => {
  it("maps frontmatter, defaulting missing description and tags", async () => {
    vi.mocked(getPublicArticles).mockResolvedValue([
      article({ title: "React Hooks", description: "useEffect", tags: ["react"] }),
      { slug: "b", readingTime: 2, frontmatter: { title: "Bare" } },
    ]);
    await expect(getSearchDocs()).resolves.toEqual([
      { slug: "a", title: "React Hooks", description: "useEffect", tags: ["react"] },
      { slug: "b", title: "Bare", description: "", tags: [] },
    ]);
  });
});

describe("searchDocs", () => {
  const docs = [
    {
      slug: "react",
      title: "React Hooks",
      description: "state in function components",
      tags: ["react", "frontend"],
    },
    {
      slug: "sql",
      title: "SQL Joins",
      description: "inner and outer joins",
      tags: ["database"],
    },
  ];
  const fuse = createFuse(docs);

  it("returns [] for empty or whitespace query", () => {
    expect(searchDocs(fuse, "")).toEqual([]);
    expect(searchDocs(fuse, "   ")).toEqual([]);
  });

  it("matches on title", () => {
    expect(searchDocs(fuse, "hooks")[0].slug).toBe("react");
  });

  it("matches on a tag", () => {
    expect(searchDocs(fuse, "database")[0].slug).toBe("sql");
  });

  it("matches on description", () => {
    expect(searchDocs(fuse, "outer joins")[0].slug).toBe("sql");
  });
});

import { describe, it, expect, afterEach } from "vitest";
import matter from "gray-matter";
import {
  writeArticleFile,
  readArticleFile,
  deleteArticleFile,
  getArticlePath,
} from "@/lib/mdx";
import type { ArticleFrontmatter } from "@/types";

// Throwaway slug so the test writes to a real file we clean up afterwards.
const SLUG = "__mdx_undefined_frontmatter_test__";

afterEach(() => {
  deleteArticleFile(SLUG);
});

describe("writeArticleFile", () => {
  it("omits undefined optional frontmatter fields instead of throwing a YAMLException", () => {
    // Mirrors what toFrontmatter() produces when optional fields are empty:
    // keys present, values undefined. js-yaml's dump rejects undefined values.
    const frontmatter: ArticleFrontmatter = {
      title: "Hello World",
      description: undefined,
      tags: undefined,
      categories: undefined,
      published: true,
      featured: undefined,
      publishedAt: undefined,
      coverImage: undefined,
    };

    expect(() => writeArticleFile(SLUG, frontmatter, "body")).not.toThrow();

    const raw = matter.read(getArticlePath(SLUG)).data;
    // Defined fields persist...
    expect(raw.title).toBe("Hello World");
    expect(raw.published).toBe(true);
    // ...undefined fields are omitted entirely, not serialized as null.
    expect(raw).not.toHaveProperty("description");
    expect(raw).not.toHaveProperty("coverImage");
    expect(raw).not.toHaveProperty("featured");

    const parsed = readArticleFile(SLUG);
    expect(parsed?.content.trim()).toBe("body");
  });
});

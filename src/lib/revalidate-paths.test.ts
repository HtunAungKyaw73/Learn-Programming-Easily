import { describe, it, expect } from "vitest";
import {
  articleChangeRevalidationPaths,
  articleRevalidationPaths,
  taxonomyRevalidationPaths,
} from "./revalidate-paths";

describe("articleChangeRevalidationPaths", () => {
  it("revalidates the page of a tag that was removed from the article", () => {
    // Regression: dropping the "react" tag from an article left /tags/react
    // still listing it, because only the post-update tags were revalidated.
    const paths = articleChangeRevalidationPaths({
      slug: "hello-world",
      tagNames: ["react", "typescript"], // before ∪ after
    });
    expect(paths).toContain("/tags/react");
    expect(paths).toContain("/tags/typescript");
  });

  it("revalidates both the old and new article paths on a slug rename", () => {
    const paths = articleChangeRevalidationPaths({
      slug: "hello-world-2",
      previousSlug: "hello-world",
      tagNames: [],
    });
    expect(paths).toContain("/articles/hello-world-2");
    expect(paths).toContain("/articles/hello-world");
  });

  it("includes the admin and shared public surfaces", () => {
    const paths = articleChangeRevalidationPaths({ slug: "x", tagNames: [] });
    for (const p of ["/admin", "/admin/articles", "/", "/articles", "/tags", "/rss.xml", "/sitemap.xml"]) {
      expect(paths).toContain(p);
    }
  });

  it("dedupes a tag present both before and after the change", () => {
    const paths = articleChangeRevalidationPaths({
      slug: "x",
      previousSlug: "x",
      tagNames: ["react", "react"],
    });
    expect(paths.filter((p) => p === "/tags/react")).toHaveLength(1);
    expect(paths.filter((p) => p === "/articles/x")).toHaveLength(1);
  });
});

describe("taxonomyRevalidationPaths", () => {
  it("revalidates the deleted tag's own page and each affected article", () => {
    // Regression: deleting the "introduction" tag left /tags/introduction and
    // the tagged article pages serving stale ISR HTML.
    const paths = taxonomyRevalidationPaths({
      tagNames: ["introduction"],
      articleSlugs: ["hello-world", "react-dev"],
    });
    expect(paths).toContain("/tags/introduction");
    expect(paths).toContain("/articles/hello-world");
    expect(paths).toContain("/articles/react-dev");
  });

  it("always revalidates the shared public surfaces", () => {
    const paths = taxonomyRevalidationPaths({});
    for (const p of ["/", "/articles", "/tags", "/rss.xml", "/sitemap.xml"]) {
      expect(paths).toContain(p);
    }
  });

  it("handles a rename by revalidating both old and new tag pages", () => {
    const paths = taxonomyRevalidationPaths({ tagNames: ["intro", "introduction"] });
    expect(paths).toContain("/tags/intro");
    expect(paths).toContain("/tags/introduction");
  });

  it("dedupes repeated names/slugs", () => {
    const paths = taxonomyRevalidationPaths({
      tagNames: ["a", "a"],
      articleSlugs: ["x", "x"],
    });
    expect(paths.filter((p) => p === "/tags/a")).toHaveLength(1);
    expect(paths.filter((p) => p === "/articles/x")).toHaveLength(1);
  });
});

describe("articleRevalidationPaths", () => {
  it("includes admin + public surfaces and the article when a slug is given", () => {
    const paths = articleRevalidationPaths("hello-world");
    for (const p of [
      "/admin",
      "/admin/articles",
      "/",
      "/articles",
      "/tags",
      "/rss.xml",
      "/sitemap.xml",
      "/articles/hello-world",
    ]) {
      expect(paths).toContain(p);
    }
  });

  it("omits the per-article path when no slug is given", () => {
    expect(articleRevalidationPaths()).not.toContain("/articles/undefined");
  });
});

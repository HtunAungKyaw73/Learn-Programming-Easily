import { describe, it, expect } from "vitest";
import {
  articleRevalidationPaths,
  taxonomyRevalidationPaths,
} from "./revalidate-paths";

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

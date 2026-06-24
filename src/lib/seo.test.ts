import { describe, it, expect } from "vitest";
import { buildSitemap, articleJsonLd } from "@/lib/seo";

describe("buildSitemap", () => {
  const base = "https://example.com";

  it("includes the three static routes plus one per article and tag", () => {
    const sm = buildSitemap(
      base,
      [{ slug: "a", publishedAt: "2026-06-24" }, { slug: "b" }],
      [{ name: "react" }],
    );
    expect(sm).toHaveLength(3 + 2 + 1);
    const urls = sm.map((e) => e.url);
    expect(urls).toContain(`${base}/`);
    expect(urls).toContain(`${base}/articles`);
    expect(urls).toContain(`${base}/tags`);
    expect(urls).toContain(`${base}/articles/a`);
    expect(urls).toContain(`${base}/articles/b`);
    expect(urls).toContain(`${base}/tags/react`);
  });

  it("uses publishedAt for an article's lastModified when present", () => {
    const sm = buildSitemap(base, [{ slug: "a", publishedAt: "2026-06-24" }], []);
    const entry = sm.find((e) => e.url === `${base}/articles/a`)!;
    expect(entry.lastModified).toEqual(new Date("2026-06-24"));
  });

  it("url-encodes tag names", () => {
    const sm = buildSitemap(base, [], [{ name: "c++" }]);
    expect(sm.map((e) => e.url)).toContain(`${base}/tags/c%2B%2B`);
  });
});

describe("articleJsonLd", () => {
  const baseInput = {
    slug: "hello",
    title: "Hello",
    authorName: "Me",
    baseUrl: "https://example.com",
  };

  it("builds a BlogPosting with the required fields", () => {
    const ld = articleJsonLd(baseInput);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.headline).toBe("Hello");
    expect(ld.url).toBe("https://example.com/articles/hello");
    expect(ld.author).toEqual({ "@type": "Person", name: "Me" });
  });

  it("includes optional fields when provided", () => {
    const ld = articleJsonLd({
      ...baseInput,
      description: "d",
      publishedAt: "2026-06-24",
      coverImage: "/c.png",
      tags: ["a", "b"],
    });
    expect(ld.description).toBe("d");
    expect(ld.datePublished).toBe("2026-06-24");
    expect(ld.image).toBe("/c.png");
    expect(ld.keywords).toBe("a, b");
  });

  it("omits optional fields when absent", () => {
    const ld = articleJsonLd(baseInput);
    expect(ld).not.toHaveProperty("description");
    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("image");
    expect(ld).not.toHaveProperty("keywords");
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("./auth-guard", () => ({ requireAuth: vi.fn() }));

import { renderMdxPreview } from "./preview";

describe("renderMdxPreview", () => {
  it("strips frontmatter and returns compiled MDX source", async () => {
    const input = "---\ntitle: Hi\n---\n\n# Heading\n\nBody text.";
    const res = await renderMdxPreview(input);

    expect(res.ok).toBe(true);
    if (res.ok) {
      // The compiled, serialized source is rendered by a client component,
      // so it must be a ready-to-hydrate compiledSource string — not raw body.
      expect(typeof res.source.compiledSource).toBe("string");
      // Body content is embedded; stripped frontmatter is not.
      expect(res.source.compiledSource).toContain("Heading");
      expect(res.source.compiledSource).toContain("Body text");
      expect(res.source.compiledSource).not.toContain("title: Hi");
    }
  });

  it("returns plain content unchanged when there is no frontmatter", async () => {
    const res = await renderMdxPreview("Just body.");

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.source.compiledSource).toContain("Just body.");
  });

  it("returns an error for invalid MDX", async () => {
    const res = await renderMdxPreview("<Unclosed>");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("MDX");
  });
});

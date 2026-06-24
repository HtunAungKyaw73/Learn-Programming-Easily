import { describe, it, expect, vi } from "vitest";

vi.mock("./auth-guard", () => ({ requireAuth: vi.fn() }));

import { renderMdxPreview } from "./preview";

describe("renderMdxPreview", () => {
  it("strips frontmatter and returns the body", async () => {
    const input = "---\ntitle: Hi\n---\n\n# Heading\n\nBody text.";
    const res = await renderMdxPreview(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.body).not.toContain("title: Hi");
      expect(res.body).toContain("# Heading");
      expect(res.body).toContain("Body text.");
    }
  });

  it("returns plain content unchanged when there is no frontmatter", async () => {
    const res = await renderMdxPreview("Just body.");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.body.trim()).toBe("Just body.");
  });
});

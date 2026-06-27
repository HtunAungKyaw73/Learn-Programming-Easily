import { describe, it, expect } from "vitest";
import { site } from "@/lib/site";

describe("site.author config", () => {
  it("exposes the author name as a string", () => {
    expect(typeof site.author.name).toBe("string");
    expect(site.author.name.length).toBeGreaterThan(0);
  });

  it("has short and long bios and an avatar path under /public", () => {
    expect(site.author.bioShort.length).toBeGreaterThan(0);
    expect(site.author.bioLong.length).toBeGreaterThan(0);
    expect(site.author.avatar.startsWith("/")).toBe(true);
  });

  it("lists only known social platforms with absolute or mailto hrefs", () => {
    const allowed = ["github", "linkedin", "email", "twitter", "website"];
    expect(site.author.socials.length).toBeGreaterThan(0);
    for (const s of site.author.socials) {
      expect(allowed).toContain(s.platform);
      expect(/^(https?:\/\/|mailto:)/.test(s.href)).toBe(true);
    }
  });

  it("includes an About entry in the nav", () => {
    expect(site.nav.some((n) => n.href === "/about")).toBe(true);
  });
});

describe("site.author.skills", () => {
  it("has categories, each with skills", () => {
    expect(site.author.skills.length).toBeGreaterThan(0);
    for (const cat of site.author.skills) {
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.skills.length).toBeGreaterThan(0);
    }
  });

  it("every skill has a name, an icon path, and a valid brand color", () => {
    const colorRe = /^(#[0-9a-fA-F]{3,8}|var\(--[a-z-]+\))$/;
    for (const cat of site.author.skills) {
      for (const s of cat.skills) {
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.iconPath.length).toBeGreaterThan(0);
        expect(s.brandColor).toMatch(colorRe);
      }
    }
  });
});

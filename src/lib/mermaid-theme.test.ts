import { describe, it, expect } from "vitest";
import { mermaidThemeVariables, type SitePalette } from "./mermaid-theme";

const light: SitePalette = {
  paper: "#fbf6ec",
  surface: "#fffdf8",
  ink: "#2a2017",
  muted: "#5e5343",
  border: "#e7dcc9",
  terracotta: "#a23b2c",
  gold: "#c9a24b",
};

const dark: SitePalette = {
  paper: "#1a1613",
  surface: "#221c17",
  ink: "#ece3d4",
  muted: "#b3a892",
  border: "#3a322a",
  terracotta: "#d9745f",
  gold: "#d8b45e",
};

describe("mermaidThemeVariables — gitGraph branches", () => {
  it("draws the main branch in terracotta and the next in gold, exactly", () => {
    // Regression: with no branch colours set, Mermaid derived them from the
    // near-white node fill and drew pale yellow lines on the cream page.
    // Explicit values are drawn as given (checked in the browser), so these
    // must be the site colours themselves, unshifted.
    const l = mermaidThemeVariables(light, false);
    const d = mermaidThemeVariables(dark, true);

    expect(l.git0).toBe(light.terracotta);
    expect(l.git1).toBe(light.gold);
    expect(d.git0).toBe(dark.terracotta);
    expect(d.git1).toBe(dark.gold);
  });

  it("fills all eight of Mermaid's branch slots", () => {
    const vars = mermaidThemeVariables(light, false);

    for (let i = 0; i < 8; i++) {
      expect(vars[`git${i}`]).toMatch(/^#[0-9a-f]{6}$/);
      expect(vars[`gitBranchLabel${i}`]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives the first four branches four different colours", () => {
    const vars = mermaidThemeVariables(light, false);
    const branches = [vars.git0, vars.git1, vars.git2, vars.git3];

    expect(new Set(branches).size).toBe(4);
  });

  it("labels each branch in a text colour that contrasts with its fill", () => {
    // Gold is a light fill in both themes, so it always takes the dark text:
    // ink on the light theme, paper on the dark one. The others take paper.
    const l = mermaidThemeVariables(light, false);
    const d = mermaidThemeVariables(dark, true);

    expect(l.gitBranchLabel0).toBe(light.paper);
    expect(l.gitBranchLabel1).toBe(light.ink);
    expect(d.gitBranchLabel0).toBe(dark.paper);
    expect(d.gitBranchLabel1).toBe(dark.paper);
  });
});

describe("mermaidThemeVariables", () => {
  it("fills nodes with the surface colour and sets text in ink", () => {
    const vars = mermaidThemeVariables(light, false);

    expect(vars.primaryColor).toBe(light.surface);
    expect(vars.mainBkg).toBe(light.surface);
    expect(vars.primaryTextColor).toBe(light.ink);
    expect(vars.textColor).toBe(light.ink);
  });

  it("draws node outlines and connecting lines in the muted colour", () => {
    const vars = mermaidThemeVariables(light, false);

    expect(vars.primaryBorderColor).toBe(light.muted);
    expect(vars.nodeBorder).toBe(light.muted);
    expect(vars.lineColor).toBe(light.muted);
  });

  it("puts edge labels on the page colour so they blend into the article", () => {
    const vars = mermaidThemeVariables(light, false);

    expect(vars.edgeLabelBackground).toBe(light.paper);
    expect(vars.background).toBe(light.paper);
  });

  it("mirrors the dark flag so Mermaid derives its other colours correctly", () => {
    expect(mermaidThemeVariables(light, false).darkMode).toBe(false);
    expect(mermaidThemeVariables(light, true).darkMode).toBe(true);
  });

  it("never emits an empty value", () => {
    // An unset CSS variable reads as "", which Mermaid's colour maths rejects.
    for (const value of Object.values(mermaidThemeVariables(light, false))) {
      expect(value).not.toBe("");
    }
  });
});

import { describe, it, expect } from "vitest";
import { svgMinWidth, svgNaturalWidth } from "./mermaid-svg";

describe("svgNaturalWidth", () => {
  it("reads the natural width Mermaid records as max-width on the svg", () => {
    const svg =
      '<svg id="m-1" width="100%" style="max-width: 923.5px;" viewBox="0 0 923.5 180"><g></g></svg>';

    expect(svgNaturalWidth(svg)).toBe(923.5);
  });

  it("ignores a max-width that belongs to an element inside the diagram", () => {
    // Only the root <svg> tag describes the diagram's own size; labels inside
    // carry their own max-width.
    const svg =
      '<svg id="m-1" width="100%" viewBox="0 0 300 100"><foreignObject><div style="max-width: 200px;">A</div></foreignObject></svg>';

    expect(svgNaturalWidth(svg)).toBeNull();
  });

  it("returns null when the svg has no max-width at all", () => {
    expect(svgNaturalWidth('<svg width="400" height="200"></svg>')).toBeNull();
  });
});

describe("svgMinWidth", () => {
  it("lets a diagram shrink to three quarters of its natural width, no further", () => {
    const svg = '<svg width="100%" style="max-width: 1000px;"></svg>';

    expect(svgMinWidth(svg)).toBe(750);
  });

  it("rounds to a whole pixel", () => {
    const svg = '<svg width="100%" style="max-width: 1050.6328125px;"></svg>';

    expect(svgMinWidth(svg)).toBe(788);
  });

  it("returns null when the natural width is unknown", () => {
    expect(svgMinWidth('<svg width="400"></svg>')).toBeNull();
  });
});

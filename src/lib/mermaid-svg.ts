// Pure helpers for <Mermaid>: read a rendered diagram's natural size and
// decide how far it may shrink.

/**
 * The width, in px, at which Mermaid laid the diagram out. Mermaid writes it
 * as `max-width` on the root `<svg>` and lets the diagram shrink to its
 * container; knowing it lets the page stop that shrinking before the text
 * becomes too small to read. `null` when the diagram type doesn't record one.
 */
export function svgNaturalWidth(svg: string): number | null {
  // Only the opening root tag: elements inside have their own max-width.
  const rootTag = /^\s*<svg\b[^>]*>/.exec(svg)?.[0];
  if (!rootTag) return null;
  const match = /max-width:\s*([\d.]+)px/.exec(rootTag);
  return match ? Number(match[1]) : null;
}

/** How far a diagram may shrink before it scrolls instead: at this fraction
 *  of natural size a 16px label is 12px, about the smallest readable. */
export const MIN_SCALE = 0.75;

/**
 * The narrowest the diagram should be drawn, in px: `MIN_SCALE` of its natural
 * width. Narrower containers scroll it sideways. `null` when unknown, in which
 * case the diagram just fits its container.
 */
export function svgMinWidth(svg: string): number | null {
  const natural = svgNaturalWidth(svg);
  return natural === null ? null : Math.round(natural * MIN_SCALE);
}

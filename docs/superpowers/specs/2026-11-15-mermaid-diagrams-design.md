# Mermaid Diagrams in Articles — Design

**Date:** 2026-11-15
**Status:** Approved

## Goal

A fenced ` ```mermaid ` block in an article body renders as a drawn diagram on
the public article page and in the admin live preview, instead of as source
text. The author writes standard Mermaid syntax; anything copied from the
Mermaid docs works unchanged.

## Background

- Today every fenced block goes to Shiki. Shiki has no `mermaid` grammar, so
  the block is printed as plain code.
- The MDX plugin pipeline is defined twice: `src/components/mdx/Mdx.tsx`
  (public, `next-mdx-remote/rsc`) and `src/lib/actions/preview.ts` (admin
  preview, `serialize`). They have already drifted — the preview has no
  `remark-gfm`, so tables render on the site but not in the preview.
- Both renderers share `mdxComponents` (`src/components/mdx/mdx-components.tsx`).
- Theme is `next-themes` with `attribute="class"`; the palette lives in CSS
  variables in `globals.css` (`--paper`, `--surface`, `--ink`, `--muted`,
  `--border`, `--terracotta`, …), redefined under `.dark`.
- Article bodies are written only by the single authenticated admin, and MDX
  already lets that author run arbitrary JSX. Diagram source carries the same
  trust as the rest of the body.

## Approaches

| | Outcome |
|---|---|
| **A. Official `mermaid`, rendered in the browser** | **Chosen.** Every diagram type, including `gitGraph`. Costs: drawn after page load, needs JS, large chunk (loaded only on pages that have a diagram). |
| B. `beautiful-mermaid`, rendered on the server | Rejected. Static SVG and automatic theming, but only 6 diagram types and HTML-in-label support unverified. |
| C. `rehype-mermaid` at compile time | Rejected. Needs headless Chromium (Playwright); not workable in Vercel functions. |

Picked by the owner on 2026-11-15, for full syntax coverage.

## Non-goals

- Server-side or build-time rendering of diagrams.
- Click handlers, zoom, pan, or an in-admin diagram editor.
- Changes to RSS, search, the table of contents, or reading-time calculation
  (diagram source words keep counting toward reading time).

## Anti-goals

- Loading the Mermaid bundle on a page that has no diagram.
- A syntax error in one diagram breaking the article page or the preview.

## Components

### 1. Shared pipeline — `src/lib/mdx-options.ts` (new)

Exports the one `mdxOptions` object (remark + rehype plugins, Shiki themes and
transformers). `Mdx.tsx` and `preview.ts` both import it and stop defining
their own lists. Side effect, intended: the preview gains `remark-gfm`.

### 2. Remark plugin — `src/lib/remark-mermaid.ts` (new)

Replaces each mdast `code` node whose `lang` is `mermaid` with an
`mdxJsxFlowElement` named `Mermaid` carrying the source verbatim in a string
`chart` attribute. Runs before Shiki, so Shiki never sees the block. Pure tree
transform, no new dependency for tree walking.

Unit tests (written first): converts a mermaid block; leaves other languages
alone; keeps the source byte-for-byte (including `<br/>` and quotes); handles a
block nested in a list or blockquote.

### 3. Client component — `src/components/mdx/Mermaid.tsx` (new)

`"use client"`. Props: `chart: string`.

- Loads `mermaid` with a dynamic `import()` inside an effect — the only place
  the package is referenced, so it stays out of every other bundle.
- `mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables })`
  then `mermaid.render(id, chart)`; the returned SVG is placed in the container.
- **Theme:** colours are read from the site's CSS variables at render time, so
  there is no second copy of the palette. Re-renders when `resolvedTheme`
  changes. The variable → `themeVariables` mapping is a pure function with a
  unit test.
- **States:** before load and without JS, the source is shown as a code block;
  on a syntax error, the source plus Mermaid's error message; on success, the
  SVG.
- **Security level:** start with Mermaid's default `strict`. The docs say
  `strict` encodes HTML tags in labels, and the motivating chart uses `<br/>`
  and `<i>`. If verification shows those tags escaped, switch to `antiscript`
  (tags allowed, scripts removed). Acceptable because of the trust note above.
  Builder's call, decided by the browser check, recorded in a code comment.

### 4. Registration — `src/components/mdx/mdx-components.tsx`

Add `Mermaid` to `mdxComponents`. Covers the public page and the preview.

### 5. Styling — `src/app/globals.css`

Diagram wrapper: centred, `not-prose`, horizontal scroll when wider than the
column.

As built (2026-11-15):

- No reserved height. The source shown before load already holds the space.
- A diagram may shrink to fit its column only down to 75% of its natural
  width; narrower than that it scrolls inside its wrapper. Found in the phone
  check: an unbounded shrink made flowchart labels unreadable. The floor is
  computed by `svgMinWidth` in `src/lib/mermaid-svg.ts` (unit-tested).
- Security level stayed at `strict`: `<br/>` and `<i>` in labels render under
  it, contrary to what the docs suggested.

## Dependencies

- Add `mermaid` (current: 12.3.0).

## Verification

- `npm test`, `tsc --noEmit`, `npm run lint`.
- Browser, with the motivating chart (flowchart LR, HTML labels, edge labels):
  light, dark, theme toggle, mobile width, one deliberately broken diagram, and
  a page with no diagram (confirm no Mermaid chunk requested). Done through a
  temporary local page that is deleted afterwards — no database writes.
- Admin preview needs the owner's login, so the owner checks that path.

## Left to the builder

- Exact `themeVariables` mapping and wrapper styles.
- Whether the loading state shows the source or a neutral placeholder, if the
  source flash looks worse in practice.
- Accessible labelling of the rendered SVG.

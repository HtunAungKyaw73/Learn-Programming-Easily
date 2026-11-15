# Mermaid Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fenced ` ```mermaid ` block in an article body renders as a drawn diagram on the public article page and in the admin preview.

**Architecture:** A remark plugin rewrites `mermaid` code blocks into a `<Mermaid chart="…" />` MDX element before Shiki runs. One shared `mdxOptions` object feeds both the public RSC renderer and the admin preview serializer. `Mermaid` is a client component that lazy-loads the `mermaid` package, renders an SVG, and re-renders on theme change using colours read from the site's CSS variables.

**Tech Stack:** Next.js 16 App Router, `next-mdx-remote` 6, `@mdx-js/mdx` 3, `mermaid` 12, `next-themes`, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-mermaid-diagrams-design.md`

## Global Constraints

- TypeScript for all files. Tailwind / `globals.css` for styling — no CSS modules.
- Server Components by default; `"use client"` only on `Mermaid.tsx`.
- `mermaid` is imported only via dynamic `import()` inside `Mermaid.tsx`. No static import anywhere.
- No new dependency other than `mermaid`. Tree walking in the remark plugin is hand-written.
- Only the exact lowercase info string `mermaid` is converted.
- Out of scope: RSS, search, ToC, reading time, zoom/pan/click, server rendering.
- Vitest: `environment: "node"`, `@` alias → `./src`. Tests cover pure logic only; the component is verified in the browser.

## Review Focus

1. **Syntax error in a diagram** — the article still renders; that diagram shows its source and the error; no stray Mermaid error graphic is left elsewhere on the page. (Task 3, browser.)
2. **Label text with `<br/>`, quotes, braces, backticks** — reaches the component byte-for-byte through MDX compilation. (Task 2 test.)
3. **Two or more diagrams on one page** — each renders, ids do not collide. (Task 3, browser.)
4. **Theme toggled while a diagram is on screen** — it re-draws in the new palette. (Task 3, browser.)
5. **Diagram wider than a phone screen** — scrolls inside its wrapper; the page itself does not scroll sideways. (Task 4, browser.)

---

## File Structure

- Create: `src/lib/remark-mermaid.ts` — mdast transform.
- Create: `src/lib/remark-mermaid.test.ts`
- Create: `src/lib/mdx-options.ts` — the single plugin pipeline.
- Create: `src/lib/mdx-options.test.ts` — compiles real MDX through the pipeline.
- Create: `src/lib/mermaid-theme.ts` — palette → Mermaid `themeVariables`.
- Create: `src/lib/mermaid-theme.test.ts`
- Create: `src/components/mdx/Mermaid.tsx` — client component.
- Modify: `src/components/mdx/Mdx.tsx`, `src/lib/actions/preview.ts` — use `mdxOptions`.
- Modify: `src/components/mdx/mdx-components.tsx` — register `Mermaid`.
- Modify: `src/app/globals.css` — wrapper styles.
- Modify: `package.json`, `package-lock.json` — add `mermaid`.

---

### Task 1: Remark plugin

**Files:** Create `src/lib/remark-mermaid.ts`; Test `src/lib/remark-mermaid.test.ts`

**Interfaces:**
- Produces: `export function remarkMermaid(): (tree: MdastNode) => void` — a unified plugin. Each `{ type: "code", lang: "mermaid", value }` node is replaced in place by `{ type: "mdxJsxFlowElement", name: "Mermaid", attributes: [{ type: "mdxJsxAttribute", name: "chart", value }], children: [] }`.

- [ ] **Step 1: Write failing tests** — `converts a mermaid code block into a Mermaid element`; `keeps the diagram source byte-for-byte` (value containing `<br/>`, `"`, `{`, `` ` ``); `leaves code blocks in other languages untouched` (`ts`, no lang, `Mermaid` capitalised); `converts a block nested inside a list or blockquote`.
- [ ] **Step 2: Run** `npm test -- src/lib/remark-mermaid.test.ts` → FAIL, module not found.
- [ ] **Step 3: Implement** with a recursive walk over `children`.
- [ ] **Step 4: Run** the same command → PASS.

### Task 2: Shared pipeline

**Files:** Create `src/lib/mdx-options.ts`; Test `src/lib/mdx-options.test.ts`; Modify `src/components/mdx/Mdx.tsx`, `src/lib/actions/preview.ts`

**Interfaces:**
- Consumes: `remarkMermaid` (Task 1).
- Produces: `export const mdxOptions` — `{ remarkPlugins: [remarkGfm, remarkMermaid], rehypePlugins: [rehypeSlug, [rehypeShiki, { themes: { light: "github-light", dark: "github-dark" }, transformers: [transformerNotationDiff(), transformerNotationHighlight()] }]] }`.

- [ ] **Step 1: Write failing tests** using `serialize` from `next-mdx-remote/serialize` with `{ mdxOptions }`: `compiles a mermaid block to a Mermaid component call carrying the source` (compiled output references `Mermaid` and contains the label text `Working directory<br/>`; does not contain `shiki` for that block); `still highlights other code blocks with Shiki`; `renders GFM tables`.
- [ ] **Step 2: Run** `npm test -- src/lib/mdx-options.test.ts` → FAIL.
- [ ] **Step 3: Implement** `mdx-options.ts`; replace the inline plugin lists in `Mdx.tsx` and `preview.ts` with it.
- [ ] **Step 4: Run** → PASS; existing `preview.test.ts` still passes.

### Task 3: Theme mapping and client component

**Files:** Create `src/lib/mermaid-theme.ts`, `src/lib/mermaid-theme.test.ts`, `src/components/mdx/Mermaid.tsx`; Modify `package.json`

**Interfaces:**
- Produces: `export interface SitePalette { paper: string; surface: string; ink: string; muted: string; border: string; terracotta: string }`; `export function mermaidThemeVariables(p: SitePalette, dark: boolean): Record<string, string | boolean>`; `export function Mermaid({ chart }: { chart: string }): JSX.Element`.

- [ ] **Step 1:** `npm install mermaid`.
- [ ] **Step 2: Write failing tests** for `mermaidThemeVariables`: node fill is `surface`, node border and lines use `border`/`muted`, text is `ink`, `darkMode` mirrors the flag, no value is empty.
- [ ] **Step 3: Run** → FAIL. **Implement** → PASS.
- [ ] **Step 4: Implement `Mermaid.tsx`.** Dynamic `import("mermaid")` in an effect; `initialize({ startOnLoad: false, theme: "base", themeVariables, securityLevel })`; `render(id, chart)` with an id derived from `useId()`; palette read with `getComputedStyle(document.documentElement)`; effect depends on `chart` and `resolvedTheme`; ignore results after unmount. Three states: source (initial / no JS), SVG, source + error message. On failure remove any element Mermaid left in `document.body`.
- [ ] **Step 5:** Security level starts at `strict`; change to `antiscript` only if the browser check shows `<br/>`/`<i>` escaped. Record the outcome in a comment.

### Task 4: Registration and styles

**Files:** Modify `src/components/mdx/mdx-components.tsx`, `src/app/globals.css`

- [ ] **Step 1:** Add `Mermaid` to `mdxComponents`.
- [ ] **Step 2:** `.mermaid-diagram` wrapper: centred, `overflow-x: auto`, vertical margin matching code blocks, reserved `min-height`; SVG `max-width: none` only when wider than the column.

### Task 5: Verification

- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint` — all clean.
- [ ] Browser, via a temporary route under `src/app/(public)/` that renders `<Mdx>` with: the spec's motivating chart, a second diagram of another type, one broken diagram, a normal code block, and a table. Check light, dark, theme toggle, 375px width, console errors. Check a page with no diagram requests no Mermaid chunk. Delete the route afterwards.
- [ ] Commits are left to the owner.

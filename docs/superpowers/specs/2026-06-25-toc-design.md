# Reading Experience — Table of Contents — Design

**Date:** 2026-06-25
**Status:** Approved
**Scope:** A per-article table of contents: a sticky side-rail with active-section highlight on wide screens, a collapsible "Contents" disclosure on narrow screens. Includes the small layout change needed to make room for the rail.

## Goal

Help readers navigate long articles: see the structure at a glance, jump to a section, and always know where they are.

## Decisions (locked)

- **Heading source:** parsed server-side from the MDX with `github-slugger` (the lib `rehype-slug` uses) so anchor ids match the rendered headings. h2 + h3 only.
- **Placement:** sticky side-rail on `xl+` (laptops); a native `<details>` "Contents" at the top of the article below `xl`. Active-section highlight (scroll-spy) on the rail only.
- **Layout:** the public `<main>` goes full-width; a shared `Container` (`max-w-3xl`) restores the current width on the listing/tag pages; the **article page** uses a wider `xl` grid so prose stays ~48rem beside a 14rem ToC column.

## Components

### `src/lib/toc.ts` (pure, tested)

```ts
export interface TocItem { depth: 2 | 3; text: string; id: string }
export function extractToc(content: string): TocItem[];
```
- Splits the MDX body by lines; toggles an "in fenced code block" flag on ```` ``` ```` lines and skips headings inside fences.
- Matches `^(##|###)\s+…` (ignores the h1 title), strips inline markdown (`` `code` ``, `**bold**`, `*em*`, `_em_`, `[text](url)` → `text`), and slugs the cleaned text with a single `GithubSlugger` instance (per call) so ids — including duplicate-heading `-1` suffixes — match `rehype-slug`.
- New dependency: `github-slugger`.

### `src/components/site/Container.tsx`

```tsx
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-3xl ${className ?? ""}`}>{children}</div>;
}
```

### `src/components/article/TableOfContents.tsx` (`"use client"`)

- Props `{ items: TocItem[] }`. Returns `null` when empty.
- `nav aria-label="Table of contents"`; a left-border list; h3 items indented.
- **Scroll-spy:** an `IntersectionObserver` (rootMargin `0px 0px -70% 0px`) over the heading elements (`document.getElementById(item.id)`); the topmost intersecting heading sets `activeId`. The active link is terracotta with a terracotta left-border; others muted. (Setting state happens in the observer callback, not the effect body — lint-safe.)

### Layout changes

- `src/app/(public)/layout.tsx`: `<main>` becomes `w-full flex-1 px-6 py-12` (drop `max-w-3xl mx-auto`); keep the skip-link, `id="main"`, and `ViewTransition`.
- `src/app/(public)/page.tsx`, `articles/page.tsx`, `tags/page.tsx`, `tags/[tag]/page.tsx`: wrap their existing root element in `<Container>` (visually unchanged).
- `src/app/(public)/articles/[slug]/page.tsx`: wrap content in
  ```
  <div className="mx-auto max-w-3xl xl:grid xl:max-w-5xl xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
    <article>…</article>
    <aside className="hidden xl:block"><div className="sticky top-24"><TableOfContents items={toc} /></div></aside>
  </div>
  ```
  and, inside the article (after the header), a `<details className="… xl:hidden">` "Contents" disclosure listing the same items (server-rendered anchor links).

### `src/app/globals.css`

```css
html { scroll-behavior: smooth; }
.prose :is(h2, h3) { scroll-margin-top: 6rem; }  /* clear the sticky header on anchor jump */
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

## Data flow

```
article content (MDX) ──extractToc──> TocItem[]
                                       ├─> <details> mobile list (server, in SSG HTML)
                                       └─> <TableOfContents> (client rail, scroll-spy)
rendered headings (rehype-slug ids) <── anchors link by matching id
```

## Error / edge handling

- Article with no h2/h3 → `extractToc` returns `[]`; both the rail (`null`) and the mobile `<details>` render nothing.
- Headings inside code fences are ignored.
- Duplicate heading text → `-1`/`-2` suffixes match `rehype-slug`.
- Anchor jumps clear the sticky header via `scroll-margin-top`; smooth scroll respects `prefers-reduced-motion`.
- The rail only mounts `xl+`; below that the `<details>` (no JS) works.

## Testing (TDD via `test-feature`)

**`src/lib/toc.test.ts`:**
- plain `##`/`###` → correct `depth`, `text`, `id`.
- a `## ` line inside a ```` ``` ```` fence is ignored.
- inline-code/bold in a heading is stripped before slugging (id matches the cleaned text).
- duplicate heading text → second id gets a `-1` suffix.
- content with no headings → `[]`.

**Gates:** `npm test` (suite grows), `npm run build` (article still SSG; listing pages visually unchanged), `npm run lint`. **Build verify:** the article's ToC `href="#…"` ids appear as heading `id="…"` in the prerendered HTML (ids match). **Manual (user):** rail on a laptop with active highlight + smooth jump; `<details>` on mobile; light/dark.

## Out of scope

- h4+ in the ToC; numbering; a "back to top" button.
- ToC on non-article pages.
- Other reading features (progress bar, prev/next, related, pagination) — separate, deferred.

# Phase 9 — Table of Contents

> A worked example of a complete feature: per-article table of contents with a sticky side-rail, scroll-spy highlighting, and a mobile fallback. Small enough to understand fully, rich enough to show the patterns.

This chapter is more of a **case study** than the others — if you read one phase end to end to see how a feature is actually built here, make it this one. The plan and spec live at [`2026-06-25-toc.md`](../superpowers/plans/2026-06-25-toc.md) and [`2026-06-25-toc-design.md`](../superpowers/specs/2026-06-25-toc-design.md).

## The problem

Long articles are hard to navigate. Readers want to:

- **See the shape** of an article at a glance (its headings).
- **Jump** to a section.
- **Know where they are** while scrolling.

On desktop there's room for a side-rail; on mobile there isn't, so it needs a collapsible fallback. And the anchors have to actually work — clicking "What is MDX" must scroll to that exact heading.

## The rationale

| Decision | Why |
|---|---|
| **Parse headings from the MDX *source*** (not the DOM) | The ToC is computed on the server from the raw text — no client-side DOM crawling, works with SSG. |
| **Generate ids with `github-slugger`** | The renderer adds heading ids with `rehype-slug`. To make anchors line up, the ToC must slugify **identically**. Same library, same output. |
| **`IntersectionObserver` for scroll-spy** | The efficient, modern way to know which heading is on screen — no scroll-event math, no layout thrashing. |
| **Side-rail on `xl`, `<details>` on mobile** | Use the space when it exists; degrade to a native disclosure when it doesn't. |

## What was built

- [`src/lib/toc.ts`](../../src/lib/toc.ts) — `extractToc(content)`: pure parser, MDX source → heading list.
- [`src/lib/toc.test.ts`](../../src/lib/toc.test.ts) — unit tests for the parser.
- [`src/components/article/TableOfContents.tsx`](../../src/components/article/TableOfContents.tsx) — the client side-rail with scroll-spy.
- Article-page integration + mobile `<details>` in [`(public)/articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx).
- Smooth-scroll + `scroll-margin-top` anchor CSS in [`globals.css`](../../src/app/globals.css).

It was delivered in four atomic commits (parser → layout container → component → integration), each tested — a good model for how to land a feature here.

## How it works

### 1. The parser — and why id-parity is the whole game

[`extractToc`](../../src/lib/toc.ts) scans the MDX text line by line, pulls `##`/`###` headings (skipping `#` h1 and anything inside ``` code fences), strips inline Markdown (`` `code` ``, `**bold**`, links), and slugs each with `github-slugger`:

```ts
import GithubSlugger from "github-slugger";

export function extractToc(content: string): TocItem[] {
  const slugger = new GithubSlugger();          // stateful: tracks duplicates
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of content.split("\n")) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }   // ignore code blocks
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length as 2 | 3;
    const text = stripInline(m[2]);
    items.push({ depth, text, id: slugger.slug(text) });
  }
  return items;
}
```

**The critical concept — id-parity.** The renderer ([`Mdx.tsx`](../../src/components/mdx/Mdx.tsx)) gives headings their `id` via **`rehype-slug`**, which internally uses **`github-slugger`**. The ToC must produce the *same* id for the same heading, or the anchor `href="#what-is-mdx"` won't match the heading `id="what-is-mdx"` and clicking does nothing. By using the identical library we guarantee they agree — *including* the duplicate-heading rule:

- `github-slugger` is **stateful**: a second "Setup" heading becomes `setup-1`, a third `setup-2`. A fresh `new GithubSlugger()` per article resets that counter. `rehype-slug` does exactly the same, so duplicates line up too.

Because the parser is a **pure function** (string in, array out), it's trivially unit-tested ([`toc.test.ts`](../../src/lib/toc.test.ts)) — extraction, fence-skipping, inline-stripping, the `-1` duplicate suffix, and empty input → `[]`.

> The summary said it best: verification confirmed the prerendered `hello-world.html` heading ids (`#what-is-mdx`, `#whats-next`, `#why-a-custom-cms`) match the ToC's hrefs exactly.

### 2. The scroll-spy component

[`TableOfContents.tsx`](../../src/components/article/TableOfContents.tsx) is a Client Component (`"use client"` — it uses browser APIs). It observes the real headings and highlights the active one:

```tsx
useEffect(() => {
  const headings = items.map(i => document.getElementById(i.id)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting)
                           .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setActiveId(visible[0].target.id);     // ← state set INSIDE the callback
  }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });
  headings.forEach(h => observer.observe(h));
  return () => observer.disconnect();
}, [items]);
```

Concepts:
- **`IntersectionObserver`** fires when observed elements enter/leave a region — far cheaper than listening to `scroll` and measuring positions yourself.
- **`rootMargin: "0px 0px -70% 0px"`** shrinks the viewport's bottom by 70%, so a heading counts as "active" only once it's near the *top* of the screen — which matches a reader's intuition of "the section I'm in."
- **State is set inside the observer callback, never in the effect body.** This sidesteps the `react-hooks/set-state-in-effect` lint rule and the render-loop it warns about.
- **Cleanup** via `observer.disconnect()` on unmount/re-run prevents leaks.
- Returns `null` when there are no items, so short articles render no empty rail. The active link is styled terracotta against the rail's left border.

### 3. Responsive integration

The article page ([`page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx)) computes `const toc = extractToc(content)` once on the server, then lays out:

```tsx
<div className="mx-auto max-w-3xl xl:grid xl:max-w-5xl xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
  <article>
    …header…
    {/* mobile: a native collapsible, hidden on xl */}
    <details className="… xl:hidden"><summary>Contents</summary>…links…</details>
    <Mdx source={content} />
  </article>
  {/* desktop: sticky side-rail, shown only on xl */}
  <aside className="hidden xl:block"><div className="sticky top-24"><TableOfContents items={toc} /></div></aside>
</div>
```

- On wide screens (`xl`), a two-column grid puts a **`sticky top-24`** rail beside the prose — it stays in view as you scroll.
- On narrow screens, the rail is hidden and a native **`<details>`** disclosure sits under the header — zero JS, accessible by default.
- This is the one page that opts *out* of the standard `Container` width (it needs the extra column) — the deliberate exception noted in [Phase 3](03-public-site.md).

### 4. The anchor CSS

Two small but essential rules in [`globals.css`](../../src/app/globals.css):

```css
html { scroll-behavior: smooth; }                 /* clicking a ToC link glides */
.prose :is(h2, h3) { scroll-margin-top: 6rem; }   /* stop BELOW the sticky header */
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

**Why `scroll-margin-top`:** the header is sticky and ~6rem tall. Without this, jumping to a heading would scroll it to `y=0` — *behind* the header. `scroll-margin-top: 6rem` tells the browser to stop 6rem short, so the heading lands *below* the header, fully visible. And smooth-scroll is disabled for reduced-motion users.

> A matching `data-scroll-behavior="smooth"` on `<html>` (in the root layout) is the Next.js-recommended way to keep route-change scrolling instant while honoring this smooth-scroll for in-page anchors.

## Trade-offs & gotchas

- **The parser is regex-based, not a full MDX AST.** It handles standard `##`/`###` ATX headings and code fences. Exotic constructs (Setext `===` headings, headings produced by a component) aren't picked up — acceptable for hand-written articles, but know the boundary.
- **Id-parity is a hidden coupling.** The parser and the renderer must keep using `github-slugger`/`rehype-slug` in lockstep. Swap one slugging strategy and anchors silently break. The shared library *is* the contract.
- **Scroll-spy only tracks `h2`/`h3`** — the same depths the rail shows. Deeper headings aren't represented.
- **Client component, but data is server-computed** — the `items` come from the server; the component only handles the interactive highlight. Keeps the client bundle tiny.

## Explore it yourself

```bash
npm test     # toc.test.ts — the parser cases
npm run dev
# open a long article:
#   - desktop (≥1280px): watch the rail highlight as you scroll; click an entry
#   - resize narrow: the rail becomes a "Contents" disclosure under the header
npm run build  # then grep an article's prerendered HTML for id="…" and compare to the ToC hrefs
```

Open:
1. [`src/lib/toc.ts`](../../src/lib/toc.ts) — the parser; note the `github-slugger` import.
2. [`src/components/article/TableOfContents.tsx`](../../src/components/article/TableOfContents.tsx) — observer + set-state-in-callback.
3. [`src/app/(public)/articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx) — the responsive grid.

← Back to the [index](README.md).

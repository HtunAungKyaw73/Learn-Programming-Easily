# Phase 4 — Search + RSS — Design

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Client-side article search (Fuse.js, ⌘K modal) and an RSS feed (`feed` package).

## Goal

Readers can find articles via a keyboard-driven search palette, and subscribe via
a standards-compliant RSS feed. Both derive from the existing filesystem-first
article source (`getAllArticles()` over MDX frontmatter). No database involvement.

## Decisions (locked)

- **Search entry point:** ⌘K / Ctrl-K modal opened from a header button.
- **Index scope:** metadata only — `title`, `description`, `tags`. No body text.
- **RSS:** `/rss.xml` only (no Atom/JSON). Summary content (title + description + link).
- **RSS visibility:** published-only, always — drafts are excluded regardless of
  `NODE_ENV`. (Contrast: the on-site article list shows drafts in dev for the author.)
- **Test runner:** Vitest.

## Components

### `src/lib/search.ts` (pure, no React)

```ts
export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

// Build the client index from visible articles.
export function getSearchDocs(): SearchDoc[];

// Configured Fuse instance: keys weighted title^2, tags, description; threshold ~0.4.
export function createFuse(docs: SearchDoc[]): Fuse<SearchDoc>;

// Ranked results for a query. Empty/whitespace query -> [].
export function searchDocs(fuse: Fuse<SearchDoc>, query: string): SearchDoc[];
```

- `getSearchDocs()` maps `getAllArticles()`; `description` falls back to `""` when
  frontmatter omits it; `tags` falls back to `[]`.
- Pure and deterministic → unit-tested directly.

### `src/components/search/Search.tsx` (`"use client"`)

- Props: `{ docs: SearchDoc[] }`.
- Builds `createFuse(docs)` in `useMemo`.
- State: `open`, `query`.
- Opens on **⌘K / Ctrl-K** (global `keydown`) and on a header button click.
- Closes on **Esc** and overlay click. Body scroll locked while open.
- Renders an input + result list; each result links to `/articles/[slug]` and
  closes the modal on navigation. Enter with results navigates to the first hit.
- Empty query → no result rows (optionally a hint). No results → "No matches".
- v1 explicitly omits arrow-key row navigation (YAGNI).

### Header wiring

- `Header` (server component) calls `getSearchDocs()` and renders
  `<Search docs={docs} />`. Index ships inline with the header HTML (a few KB),
  so there is no extra client fetch.

### `src/lib/rss.ts` (pure)

```ts
export function buildRssXml(): string;
```

- Reads articles and keeps only `frontmatter.published === true`
  (independent of `NODE_ENV`).
- Builds a `feed` `Feed` with site identity from `src/lib/site.ts`
  (title, description, id/link = `site.url`, author, copyright, feed self-link
  `/rss.xml`).
- One item per article: `title`, `id`/`link` = `${site.url}/articles/${slug}`,
  `description`, `date` (from `publishedAt`), `category` per tag.
- Returns `feed.rss2()`.

### `src/app/rss.xml/route.ts`

```ts
export const dynamic = "force-static";
export function GET(): Response; // body = buildRssXml(), Content-Type application/rss+xml
```

- Prerendered at build. Satisfies the existing footer `/rss.xml` link.

## Data flow

```
content/*.mdx ──getAllArticles()──┬─ getSearchDocs() ─> <Search docs> (header, client Fuse)
                                  └─ buildRssXml()  ─> /rss.xml (force-static)
```

## Error / edge handling

- Empty content dir → search shows "No matches"; RSS emits a valid feed with zero items.
- Article missing `description` → `""` in index; omitted from RSS item description.
- Article missing `publishedAt` → RSS item date falls back to `new Date(0)` (or omit);
  search unaffected.
- Whitespace-only query → `[]`, no rows.

## Testing (TDD — write tests first)

**`src/lib/search.test.ts`**
- `getSearchDocs` maps slug/title/description/tags; missing description→`""`, missing tags→`[]`.
- `searchDocs` matches on title, on a tag, on description; ranks title over description.
- empty/whitespace query → `[]`.

**`src/lib/rss.test.ts`**
- includes a published article (title + `/articles/<slug>` link present in XML).
- **excludes a draft** (`published: false`) even when `NODE_ENV !== "production"`.
- output is well-formed RSS (`<rss`, `<channel>`, `<item>` present).

Add `"test": "vitest"` to `package.json`. Vitest config: `node` environment for these
pure libs (no jsdom needed). Tests may use a small fixture content dir or mock
`getAllArticles`.

## Out of scope (deferred)

- Full-text body indexing.
- Atom / JSON Feed formats.
- Arrow-key result navigation, recent/popular suggestions in empty state.
- DB-backed search.

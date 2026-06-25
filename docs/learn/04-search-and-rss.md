# Phase 4 — Search & RSS

> Let readers find articles (instant client-side fuzzy search) and subscribe (RSS 2.0 feed). And learn the most important architectural lesson in the codebase: the **client/server module boundary**.

## The problem

Two reader features:

1. **Search.** A reader hits `⌘K`, types, and sees matching articles *instantly* — including for typos and partial words. No round-trip to a server per keystroke.
2. **RSS.** Feed-reader users want to subscribe at `/rss.xml` and get new articles automatically.

The search requirement creates a trap: the search index has to reach the **browser** (so matching is instant), but the article data is read from the **filesystem** (server-only, uses `fs`). If you're not careful, you pull `fs` into the client bundle and the build explodes.

## The rationale

| Decision | Why |
|---|---|
| **Client-side search with Fuse.js** | The article set is small (one author). Ship a tiny metadata index to the browser and match locally → zero latency, no search backend, works offline. |
| **Fuzzy matching** | Readers misremember titles. Fuse tolerates typos and ranks by relevance. |
| **Split search into two modules** | Strictly separate browser-safe code from filesystem code, so the client bundle never imports `fs`. *This is the key lesson.* |
| **RSS via the `feed` package** | Don't hand-assemble XML. `feed` produces spec-correct RSS 2.0. |

## What was built

Search:
- [`src/lib/search.ts`](../../src/lib/search.ts) — **client-safe**: the Fuse config, the query function, an arrow-key nav helper. No `fs`.
- [`src/lib/search-index.ts`](../../src/lib/search-index.ts) — **server-only**: builds the index from the DB.
- [`src/components/search/Search.tsx`](../../src/components/search/Search.tsx) — the `⌘K` modal (Client Component).

RSS:
- [`src/lib/rss.ts`](../../src/lib/rss.ts) — builds the feed XML.
- [`src/app/rss.xml/route.ts`](../../src/app/rss.xml/route.ts) — the route that serves it.

## How it works

### The client/server module boundary — *read this twice*

This is the concept that explains the whole file split.

> In Next.js App Router, a module imported (even indirectly) by a Client Component gets bundled for the **browser**. Browser bundles cannot contain Node-only modules like `fs`.

The `<Search>` modal runs in the browser (it has state, keyboard handlers, a portal). It needs the Fuse configuration. If that config lived in the same file as the index builder — which reads articles via the `fs`-backed query layer — importing it into `<Search>` would drag `fs` into the client bundle. **Build error.**

The fix is a clean split:

```
search.ts          (client-safe)         search-index.ts     (server-only)
─────────────────────────────────        ─────────────────────────────────
import Fuse from "fuse.js"                import { getPublicArticles }  ← touches DB/fs
createFuse(docs)                          getSearchDocs(): Promise<SearchDoc[]>
searchDocs(fuse, query)
nextActiveIndex(...)
        ▲                                          │
        │ imported by                              │ imported by
   <Search> (browser)                         <Header> (server)
```

- The **server** `<Header>` calls `getSearchDocs()` (from `search-index.ts`) to build the index, then passes it as a **prop** to `<Search>`.
- `<Search>` only imports `search.ts` — pure, browser-safe code.

So the data crosses the boundary as **serialized props**, not as a shared `fs` import. The comment at the top of each file states the rule explicitly — heed it.

### How the search itself works

The index entry is deliberately tiny — metadata only, no article bodies:

```ts
interface SearchDoc { slug: string; title: string; description: string; tags: string[]; }
```

Fuse is configured to weight titles highest:

```ts
new Fuse(docs, {
  keys: [{ name: "title", weight: 2 }, { name: "tags", weight: 1 }, { name: "description", weight: 1 }],
  threshold: 0.4,        // 0 = exact only, 1 = match anything; 0.4 is a forgiving middle
  ignoreLocation: true,  // match anywhere in the string, not just the start
});
```

`searchDocs(fuse, query)` trims the query and returns `[]` for empty input (so an empty box shows nothing, not everything). `nextActiveIndex(...)` is a pure helper for ↑/↓ keyboard navigation through results, clamped to range — pulled out as its own function precisely so it can be **unit-tested** without rendering the modal.

### The `⌘K` modal

[`Search.tsx`](../../src/components/search/Search.tsx) is a Client Component that:
- Opens on `⌘K` / `Ctrl-K` (global key listener).
- Renders into `document.body` via a **portal** so the modal escapes any `overflow:hidden`/stacking context in the header.
- Has dialog roles, focus trapping, arrow-key navigation, and returns focus on close (accessibility work from [Phase 7](07-polish.md)).

> **Hydration footnote.** Because the portal targets `document.body`, it's gated on a client-mounted flag (`useSyncExternalStore`) so server and first client render agree — otherwise React warns about a hydration mismatch. That's the `fix(search): gate body-portal on client-mounted flag` commit.

### RSS

[`buildRssXml()`](../../src/lib/rss.ts) creates a `Feed`, fills channel metadata from [`site.ts`](../../src/lib/site.ts), then adds **published articles only**:

```ts
for (const article of getAllArticles()) {
  if (article.frontmatter.published !== true) continue;   // never leak drafts
  feed.addItem({ title, id: url, link: url, description, date, category: tags });
}
return feed.rss2();
```

The route exposes it:

```ts
// src/app/rss.xml/route.ts  — a Route Handler returning XML
export function GET() {
  return new Response(buildRssXml(), { headers: { "Content-Type": "application/xml" } });
}
```

And the root layout advertises it in `<head>` via `alternates.types["application/rss+xml"]`, so browsers and readers can auto-discover the feed.

**Concept:** unlike React pages, a **Route Handler** returns a raw `Response`. That's how you serve non-HTML (XML, JSON, images) from the App Router. Note RSS reads from the **filesystem** (`getAllArticles`) and double-checks `published === true` — a deliberate belt-and-suspenders so an unpublished draft can never appear in the public feed.

## Trade-offs & gotchas

- **Client search scales to *small* corpora.** The whole index ships to every visitor. For one author that's kilobytes. For thousands of articles you'd switch to a server search index — but that would be over-engineering here.
- **The boundary is easy to break silently.** Add one `fs`-touching import to `search.ts` and the build fails with a confusing client-bundle error. The top-of-file comments are load-bearing documentation.
- **The search index only includes published articles** (it's built from `getPublicArticles()`), so drafts are never searchable on the public site — correct, but remember it when a draft "won't show up."

## Explore it yourself

```bash
npm test           # runs the search + rss unit tests (Vitest)
npm run dev
# press ⌘K (or Ctrl-K), type a partial/misspelled title
curl http://localhost:3000/rss.xml   # see the generated feed
```

Open:
1. [`src/lib/search.ts`](../../src/lib/search.ts) and [`search-index.ts`](../../src/lib/search-index.ts) — read both top comments back to back; the split *is* the lesson.
2. [`src/lib/search.test.ts`](../../src/lib/search.test.ts) — see `nextActiveIndex`/`searchDocs` tested in isolation.
3. [`src/lib/rss.ts`](../../src/lib/rss.ts) — note the `published !== true` guard.

→ Next: [Phase 5 — Auth](05-auth.md)

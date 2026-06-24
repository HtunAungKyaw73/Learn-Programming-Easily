# Phase 4 — Search + RSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side article search (Fuse.js, ⌘K modal) and an RSS feed (`/rss.xml`) to the CMS.

**Architecture:** Both features derive from the existing filesystem-first source `getAllArticles()` (MDX frontmatter, no DB). Two pure libs (`search.ts`, `rss.ts`) are unit-tested first; a client `<Search>` island mounts in the server `Header`; an `/rss.xml` route handler is statically generated.

**Tech Stack:** Next.js 16 App Router, TypeScript, Fuse.js 7, `feed` 5, Vitest (new), Tailwind.

## Global Constraints

- TypeScript for all files; Tailwind for styling (no CSS modules).
- Server Components by default; `"use client"` only where interactivity requires it.
- Search index is **metadata only**: `title`, `description`, `tags`. No body text.
- RSS is **published-only, always** (`frontmatter.published === true`), independent of `NODE_ENV`. Summary content only (title + description + link).
- Path alias `@/*` → `./src/*`.
- Run Vitest/Node tooling under Node 22+ (`nvm use`), matching `engines.node>=22`.
- Existing source: `getAllArticles()` returns `ArticleListItem[]` where `ArticleListItem = { slug: string; frontmatter: ArticleFrontmatter; readingTime: number }` and `ArticleFrontmatter = { title: string; description?: string; tags?: string[]; published?: boolean; featured?: boolean; publishedAt?: string; coverImage?: string }`. `site` (from `@/lib/site`) has `{ name, description, url, author }`.

---

### Task 1: Search library (`search.ts`) + Vitest bootstrap

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script + Vitest devDep)
- Create: `src/lib/search.ts`
- Test: `src/lib/search.test.ts`

**Interfaces:**
- Consumes: `getAllArticles()` from `@/lib/mdx` (mocked in tests).
- Produces:
  - `interface SearchDoc { slug: string; title: string; description: string; tags: string[] }`
  - `getSearchDocs(): SearchDoc[]`
  - `createFuse(docs: SearchDoc[]): Fuse<SearchDoc>`
  - `searchDocs(fuse: Fuse<SearchDoc>, query: string): SearchDoc[]`

- [ ] **Step 1: Install Vitest and add config + script**

```bash
nvm use 22.13.1
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

Add to `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/search.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mdx", () => ({
  getAllArticles: vi.fn(),
}));

import { getAllArticles } from "@/lib/mdx";
import { getSearchDocs, createFuse, searchDocs } from "@/lib/search";

const article = (over: Record<string, unknown> = {}) => ({
  slug: "a",
  readingTime: 1,
  frontmatter: { title: "Title", ...over },
});

beforeEach(() => {
  vi.mocked(getAllArticles).mockReset();
});

describe("getSearchDocs", () => {
  it("maps frontmatter, defaulting missing description and tags", () => {
    vi.mocked(getAllArticles).mockReturnValue([
      article({ title: "React Hooks", description: "useEffect", tags: ["react"] }),
      { slug: "b", readingTime: 2, frontmatter: { title: "Bare" } },
    ]);
    expect(getSearchDocs()).toEqual([
      { slug: "a", title: "React Hooks", description: "useEffect", tags: ["react"] },
      { slug: "b", title: "Bare", description: "", tags: [] },
    ]);
  });
});

describe("searchDocs", () => {
  const docs = [
    { slug: "react", title: "React Hooks", description: "state in function components", tags: ["react", "frontend"] },
    { slug: "sql", title: "SQL Joins", description: "inner and outer joins", tags: ["database"] },
  ];
  const fuse = createFuse(docs);

  it("returns [] for empty or whitespace query", () => {
    expect(searchDocs(fuse, "")).toEqual([]);
    expect(searchDocs(fuse, "   ")).toEqual([]);
  });

  it("matches on title", () => {
    expect(searchDocs(fuse, "hooks")[0].slug).toBe("react");
  });

  it("matches on a tag", () => {
    expect(searchDocs(fuse, "database")[0].slug).toBe("sql");
  });

  it("matches on description", () => {
    expect(searchDocs(fuse, "outer joins")[0].slug).toBe("sql");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `search.ts` has no such exports / module not found.

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/search.ts`:

```ts
import Fuse from "fuse.js";
import { getAllArticles } from "@/lib/mdx";

export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

/** Build the client search index from visible articles (metadata only). */
export function getSearchDocs(): SearchDoc[] {
  return getAllArticles().map((a) => ({
    slug: a.slug,
    title: a.frontmatter.title,
    description: a.frontmatter.description ?? "",
    tags: a.frontmatter.tags ?? [],
  }));
}

/** Configured Fuse instance: title weighted over tags/description. */
export function createFuse(docs: SearchDoc[]): Fuse<SearchDoc> {
  return new Fuse(docs, {
    keys: [
      { name: "title", weight: 2 },
      { name: "tags", weight: 1 },
      { name: "description", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });
}

/** Ranked results. Empty/whitespace query returns []. */
export function searchDocs(fuse: Fuse<SearchDoc>, query: string): SearchDoc[] {
  const q = query.trim();
  if (!q) return [];
  return fuse.search(q).map((r) => r.item);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all `search.test.ts` cases green).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/search.ts src/lib/search.test.ts
git commit -m "feat(search): metadata search lib + Vitest setup"
```

---

### Task 2: RSS library (`rss.ts`)

**Files:**
- Create: `src/lib/rss.ts`
- Test: `src/lib/rss.test.ts`

**Interfaces:**
- Consumes: `getAllArticles()` from `@/lib/mdx` (mocked in tests); `site` from `@/lib/site`.
- Produces: `buildRssXml(): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/rss.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mdx", () => ({ getAllArticles: vi.fn() }));

import { getAllArticles } from "@/lib/mdx";
import { buildRssXml } from "@/lib/rss";

beforeEach(() => vi.mocked(getAllArticles).mockReset());

describe("buildRssXml", () => {
  it("includes published articles and is well-formed RSS", () => {
    vi.mocked(getAllArticles).mockReturnValue([
      {
        slug: "hello-world",
        readingTime: 1,
        frontmatter: {
          title: "Hello World",
          description: "Intro",
          published: true,
          publishedAt: "2026-06-24",
          tags: ["meta"],
        },
      },
    ]);
    const xml = buildRssXml();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("Hello World");
    expect(xml).toContain("/articles/hello-world");
  });

  it("excludes drafts even outside production", () => {
    vi.mocked(getAllArticles).mockReturnValue([
      { slug: "draft", readingTime: 1, frontmatter: { title: "Secret Draft", published: false } },
      { slug: "live", readingTime: 1, frontmatter: { title: "Live Post", published: true } },
    ]);
    const xml = buildRssXml();
    expect(xml).toContain("Live Post");
    expect(xml).not.toContain("Secret Draft");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/rss.test.ts`
Expected: FAIL — `buildRssXml` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/rss.ts`:

```ts
import { Feed } from "feed";
import { getAllArticles } from "@/lib/mdx";
import { site } from "@/lib/site";

/** Render the public RSS 2.0 feed. Published articles only, always. */
export function buildRssXml(): string {
  const feed = new Feed({
    title: site.name,
    description: site.description,
    id: site.url,
    link: site.url,
    language: "en",
    copyright: `© ${new Date().getFullYear()} ${site.author}`,
    author: { name: site.author },
    feedLinks: { rss2: `${site.url}/rss.xml` },
  });

  for (const article of getAllArticles()) {
    if (article.frontmatter.published !== true) continue;
    const url = `${site.url}/articles/${article.slug}`;
    feed.addItem({
      title: article.frontmatter.title,
      id: url,
      link: url,
      description: article.frontmatter.description ?? "",
      date: article.frontmatter.publishedAt
        ? new Date(article.frontmatter.publishedAt)
        : new Date(0),
      category: (article.frontmatter.tags ?? []).map((name) => ({ name })),
    });
  }

  return feed.rss2();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/rss.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rss.ts src/lib/rss.test.ts
git commit -m "feat(rss): published-only RSS feed builder"
```

---

### Task 3: RSS route handler (`/rss.xml`)

**Files:**
- Create: `src/app/rss.xml/route.ts`

**Interfaces:**
- Consumes: `buildRssXml()` from `@/lib/rss`.
- Produces: a statically-generated `GET /rss.xml` returning RSS XML.

- [ ] **Step 1: Create the route handler**

Create `src/app/rss.xml/route.ts`:

```ts
import { buildRssXml } from "@/lib/rss";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildRssXml(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Verify it builds and serves**

Run: `npm run build`
Expected: build succeeds; route list includes `○ /rss.xml` (static).

Then spot-check the prerendered output:

Run: `grep -l "<rss" .next/server/app/rss.xml* 2>/dev/null || grep -rl "<rss" .next/server/app/rss.xml.body 2>/dev/null`
Expected: the prerendered RSS body contains `<rss`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/rss.xml/route.ts"
git commit -m "feat(rss): static /rss.xml route"
```

---

### Task 4: Search modal component (`<Search>`)

**Files:**
- Create: `src/components/search/Search.tsx`

**Interfaces:**
- Consumes: `SearchDoc`, `createFuse`, `searchDocs` from `@/lib/search`.
- Produces: `Search` — a client component, props `{ docs: SearchDoc[] }`.

- [ ] **Step 1: Write the component**

Create `src/components/search/Search.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createFuse, searchDocs, type SearchDoc } from "@/lib/search";

export function Search({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => createFuse(docs), [docs]);
  const results = useMemo(() => searchDocs(fuse, query).slice(0, 8), [fuse, query]);

  // ⌘K / Ctrl-K toggles; Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll + reset query while open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    setQuery("");
  }, [open]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/articles/${slug}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
        aria-label="Search"
      >
        <span>Search</span>
        <kbd className="hidden rounded bg-zinc-100 px-1.5 font-mono text-xs text-zinc-500 sm:inline dark:bg-zinc-800">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[0]) go(results[0].slug);
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full border-b border-zinc-200 bg-transparent px-4 py-3.5 text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:text-zinc-100"
              />
            </form>
            <ul className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No matches
                </li>
              )}
              {results.map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                      {doc.title}
                    </span>
                    {doc.description && (
                      <span className="mt-0.5 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {doc.description}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it type-checks/builds (wired in Task 5)**

No standalone test (interactive UI; logic is covered by `search.test.ts`). Build verification happens after Task 5 wires it in.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/Search.tsx
git commit -m "feat(search): ⌘K search modal component"
```

---

### Task 5: Wire `<Search>` into the header

**Files:**
- Modify: `src/components/site/Header.tsx`

**Interfaces:**
- Consumes: `Search` from `@/components/search/Search`; `getSearchDocs` from `@/lib/search`.

- [ ] **Step 1: Add imports**

In `src/components/site/Header.tsx`, add to the existing imports:

```tsx
import { Search } from "@/components/search/Search";
import { getSearchDocs } from "@/lib/search";
```

- [ ] **Step 2: Render `<Search>` in the nav**

In `Header`, compute the index and place the search control before the nav links. Replace the `<nav>…</nav>` block so it reads:

```tsx
export function Header() {
  const docs = getSearchDocs();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          {site.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <Search docs={docs} />
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Build + full check**

Run: `npm test && npm run build && npm run lint`
Expected: tests PASS; build succeeds (home/articles/tags static, `/rss.xml` static); lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/Header.tsx
git commit -m "feat(search): mount search in site header"
```

---

## Self-Review

**Spec coverage:**
- ⌘K modal, header button → Task 4 + Task 5. ✓
- Metadata-only index (title/description/tags) → `getSearchDocs` Task 1. ✓
- Fuse weighting/threshold → `createFuse` Task 1. ✓
- `/rss.xml`, summary, published-only-always → Tasks 2–3. ✓
- Drafts excluded regardless of env → `rss.test.ts` second case. ✓
- Vitest + `test` script → Task 1. ✓
- Footer `/rss.xml` link now resolves → Task 3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `SearchDoc` shape identical across search.ts, search.test.ts, Search.tsx. `getSearchDocs/createFuse/searchDocs/buildRssXml` signatures match consumers. `ArticleListItem` mocks match the real type (slug/readingTime/frontmatter). ✓

## Notes / Risks

- `feed` `rss2()` HTML-escapes content, so the draft-exclusion assertion (`not.toContain("Secret Draft")`) is reliable — a draft simply produces no item.
- Search index is inlined into the (static) header HTML on every page; metadata-only keeps it small. Revisit if article count grows large.

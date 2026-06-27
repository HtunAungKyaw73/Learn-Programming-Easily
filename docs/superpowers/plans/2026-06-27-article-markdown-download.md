# Article Markdown Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin download any article as a round-trippable `.md` file (YAML frontmatter rebuilt from DB metadata + raw MDX body) from the admin panel.

**Architecture:** A pure serializer turns an `ArticleWithContent` into a markdown string via `gray-matter`'s `matter.stringify`. An auth-gated `GET` route handler under `/admin/articles/[slug]/download` fetches the article and returns it as a file attachment. Download links are added to the articles list row and the edit page header.

**Tech Stack:** Next.js App Router (route handlers), TypeScript, `gray-matter`, Prisma, Vitest.

## Global Constraints

- TypeScript for all files.
- Tailwind CSS for styling — no CSS modules / styled-components.
- Server Components by default; `"use client"` only when needed.
- `gray-matter` is the only frontmatter (de)serializer — already a dependency.
- Prisma client is a singleton (already provided via `@/lib/queries`).
- Admin routes live under `src/app/admin/(protected)/`; `/admin/:path*` is auth-gated by middleware (`src/proxy.ts`). Route handlers still call `requireAuth()` defensively.
- Vitest config: `environment: "node"`, `@` alias → `./src`.

---

## File Structure

- Create: `src/lib/articleMarkdown.ts` — pure serializer `toMarkdownFile`.
- Create: `src/lib/articleMarkdown.test.ts` — Vitest unit test for the serializer.
- Create: `src/app/admin/(protected)/articles/[slug]/download/route.ts` — `GET` route handler.
- Modify: `src/app/admin/(protected)/articles/page.tsx` — add download icon to Actions column.
- Modify: `src/app/admin/(protected)/articles/[slug]/edit/page.tsx` — add download button to header.

---

### Task 1: Markdown serializer

**Files:**
- Create: `src/lib/articleMarkdown.ts`
- Test: `src/lib/articleMarkdown.test.ts`

**Interfaces:**
- Consumes: `ArticleWithContent` from `@/types`; `matter` from `gray-matter`.
- Produces: `export function toMarkdownFile(article: ArticleWithContent): string`

The `ArticleWithContent` shape (from `src/types/index.ts`):
```ts
interface ArticleMeta {
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  readingTime: number | null;
  coverImage: string | null;
  tags: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}
interface ArticleWithContent extends ArticleMeta { content: string; }
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/articleMarkdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { toMarkdownFile } from "./articleMarkdown";
import type { ArticleWithContent } from "@/types";

function makeArticle(
  overrides: Partial<ArticleWithContent> = {},
): ArticleWithContent {
  return {
    slug: "hello-world",
    title: "Hello World",
    description: "A greeting",
    published: true,
    featured: false,
    publishedAt: new Date("2026-06-27T10:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    readingTime: 3,
    coverImage: "https://example.com/c.png",
    tags: [
      { id: 1, name: "react", slug: "react" },
      { id: 2, name: "next", slug: "next" },
    ],
    categories: [{ id: 1, name: "Frontend", slug: "frontend" }],
    content: "# Hello\n\nBody text.",
    ...overrides,
  };
}

describe("toMarkdownFile", () => {
  it("writes frontmatter from metadata and preserves the body", () => {
    const md = toMarkdownFile(makeArticle());
    const parsed = matter(md);

    expect(parsed.content.trim()).toBe("# Hello\n\nBody text.");
    expect(parsed.data.title).toBe("Hello World");
    expect(parsed.data.description).toBe("A greeting");
    expect(parsed.data.tags).toEqual(["react", "next"]);
    expect(parsed.data.categories).toEqual(["Frontend"]);
    expect(parsed.data.published).toBe(true);
    expect(parsed.data.featured).toBe(false);
    expect(parsed.data.coverImage).toBe("https://example.com/c.png");
  });

  it("formats publishedAt as a YYYY-MM-DD string", () => {
    const md = toMarkdownFile(makeArticle());
    const parsed = matter(md);
    expect(parsed.data.publishedAt).toBe("2026-06-27");
  });

  it("omits null and empty optional fields", () => {
    const md = toMarkdownFile(
      makeArticle({
        description: null,
        coverImage: null,
        publishedAt: null,
        tags: [],
        categories: [],
      }),
    );
    const parsed = matter(md);

    expect(parsed.data).not.toHaveProperty("description");
    expect(parsed.data).not.toHaveProperty("coverImage");
    expect(parsed.data).not.toHaveProperty("publishedAt");
    expect(parsed.data).not.toHaveProperty("tags");
    expect(parsed.data).not.toHaveProperty("categories");
    // Required fields still present.
    expect(parsed.data.title).toBe("Hello World");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/articleMarkdown.test.ts`
Expected: FAIL — cannot resolve `./articleMarkdown` / `toMarkdownFile is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/articleMarkdown.ts`:

```ts
import matter from "gray-matter";
import type { ArticleWithContent, ArticleFrontmatter } from "@/types";

/**
 * Serialize an article into a round-trippable Markdown file: YAML frontmatter
 * rebuilt from DB metadata followed by the raw MDX body. The frontmatter shape
 * matches `ArticleFrontmatter`, so the output re-parses cleanly via gray-matter.
 */
export function toMarkdownFile(article: ArticleWithContent): string {
  const frontmatter: ArticleFrontmatter = {
    title: article.title,
    published: article.published,
    featured: article.featured,
  };

  if (article.description) frontmatter.description = article.description;
  if (article.coverImage) frontmatter.coverImage = article.coverImage;
  if (article.publishedAt) {
    frontmatter.publishedAt = article.publishedAt.toISOString().split("T")[0];
  }
  if (article.tags.length > 0) {
    frontmatter.tags = article.tags.map((t) => t.name);
  }
  if (article.categories.length > 0) {
    frontmatter.categories = article.categories.map((c) => c.name);
  }

  return matter.stringify(article.content, frontmatter);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/articleMarkdown.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/articleMarkdown.ts src/lib/articleMarkdown.test.ts
git commit -m "feat(admin): add article markdown serializer"
```

---

### Task 2: Download route handler

**Files:**
- Create: `src/app/admin/(protected)/articles/[slug]/download/route.ts`

**Interfaces:**
- Consumes: `toMarkdownFile` from `@/lib/articleMarkdown`; `getAdminArticleBySlug` from `@/lib/queries`; `requireAuth` from `@/lib/actions/auth-guard`.
- Produces: `export async function GET(req, ctx): Promise<Response>` at route `/admin/articles/[slug]/download`.

- [ ] **Step 1: Write the implementation**

Create `src/app/admin/(protected)/articles/[slug]/download/route.ts`:

```ts
import { getAdminArticleBySlug } from "@/lib/queries";
import { requireAuth } from "@/lib/actions/auth-guard";
import { toMarkdownFile } from "@/lib/articleMarkdown";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireAuth();
  const { slug } = await params;

  const article = await getAdminArticleBySlug(slug);
  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(toMarkdownFile(article), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
```

- [ ] **Step 2: Verify it compiles / lints**

Run: `npx tsc --noEmit && npx eslint "src/app/admin/(protected)/articles/[slug]/download/route.ts"`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/articles/[slug]/download/route.ts"
git commit -m "feat(admin): add article markdown download route"
```

---

### Task 3: Download buttons in admin UI

**Files:**
- Modify: `src/app/admin/(protected)/articles/page.tsx`
- Modify: `src/app/admin/(protected)/articles/[slug]/edit/page.tsx`

**Interfaces:**
- Consumes: the route `/admin/articles/${slug}/download` from Task 2. No new exports.

- [ ] **Step 1: Add the download icon to the list-row Actions column**

In `src/app/admin/(protected)/articles/page.tsx`, inside the Actions `<div className="flex items-center gap-1">`, add as the **first** child (before the "View on site" anchor):

```tsx
<a
  href={`/admin/articles/${article.slug}/download`}
  download
  aria-label="Download Markdown"
  title="Download Markdown"
  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
>
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
</a>
```

- [ ] **Step 2: Add the download button to the edit page header**

In `src/app/admin/(protected)/articles/[slug]/edit/page.tsx`, replace the heading block so the title and a download button sit on one row. Change:

```tsx
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Edit Article
      </h1>
```

to:

```tsx
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Edit Article
        </h1>
        <a
          href={`/admin/articles/${slug}/download`}
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Download .md
        </a>
      </div>
```

- [ ] **Step 3: Verify it compiles / lints**

Run: `npx tsc --noEmit && npx eslint "src/app/admin/(protected)/articles/page.tsx" "src/app/admin/(protected)/articles/[slug]/edit/page.tsx"`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (existing suites + Task 1's 3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/articles/page.tsx" "src/app/admin/(protected)/articles/[slug]/edit/page.tsx"
git commit -m "feat(admin): add markdown download buttons to articles list and edit page"
```

---

## Self-Review

- **Spec coverage:** Serializer (§1) → Task 1. Route handler (§2) → Task 2. List-row button (§3) → Task 3 Step 1. Edit-page button (§4) → Task 3 Step 2. Testing → Task 1 tests + Task 3 full-suite run. Error handling (404 / auth) → Task 2. All spec sections covered.
- **Placeholder scan:** None — all steps contain full code/commands.
- **Type consistency:** `toMarkdownFile(article: ArticleWithContent): string` defined in Task 1, consumed identically in Task 2. `ArticleFrontmatter` fields match `src/types/index.ts`. Route param type `{ params: Promise<{ slug: string }> }` matches the App Router async-params pattern used in `edit/page.tsx`.

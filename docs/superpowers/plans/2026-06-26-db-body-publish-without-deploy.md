# DB-backed Article Bodies (Publish Without Deploy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move article MDX bodies from `content/*.mdx` files into a Postgres column so creating/editing an article goes live via on-demand ISR with no Vercel redeploy.

**Architecture:** Add a `body` column to `Article`; backfill it from existing files; switch every public read, the admin edit read, and the write actions to the DB; render the public article page from the DB with on-demand ISR (existing `revalidatePath` calls); then delete the file-based code and `content/`.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 7 + `@prisma/adapter-pg` (Postgres), `next-mdx-remote/rsc` + Shiki, Vitest, `tsx` scripts.

## Global Constraints

- Prisma CLI and all `tsx` scripts run on **Node 22+** (`nvm use 22`).
- Prisma client is imported from `@/generated/prisma/client`; scripts import from `../src/generated/prisma/client` and start with `import "dotenv/config";`.
- Prisma client is instantiated via `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`.
- Source of truth for bodies is **Postgres only** — no runtime filesystem reads/writes for article content.
- Public routes serve **published articles only** (unpublished → `404`).
- Tests use Vitest with `vi.mock("@/lib/prisma", …)`; run with `npm test` (Node 22).
- Gates per task: `npm test`, `npm run lint`; migration tasks also run `npm run build`.

---

### Task 1: Add nullable `body` column (Migration A)

**Files:**
- Modify: `prisma/schema.prisma` (Article model)
- Create: `prisma/migrations/<timestamp>_add_article_body/migration.sql` (generated)

**Interfaces:**
- Produces: `Article.body: String | null` (nullable column) available to all later tasks.

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, add `body` to the `Article` model (nullable for now):

```prisma
model Article {
  id          Int      @id @default(autoincrement())
  slug        String   @unique
  title       String
  description String?
  published   Boolean  @default(false)
  featured    Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  readingTime Int?
  coverImage  String?
  body        String?

  tags       Tag[]      @relation("ArticleTags")
  categories Category[] @relation("ArticleCategories")
}
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
nvm use 22
npx prisma migrate dev --name add_article_body
```
Expected: migration created and applied; `prisma generate` runs; output ends with "Your database is now in sync with your schema."

- [ ] **Step 3: Verify the column exists and client is regenerated**

Run:
```bash
npx prisma db execute --stdin <<'SQL'
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'Article' AND column_name = 'body';
SQL
```
Expected: one row, `body | YES`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/generated/prisma
git commit -m "feat(db): add nullable Article.body column"
```

---

### Task 2: Backfill `body` from content files

**Files:**
- Create: `scripts/backfill-body.ts`
- Modify: `package.json` (add `backfill:body` script)

**Interfaces:**
- Consumes: `Article.body` (nullable) from Task 1; `content/*.mdx` files.
- Produces: every existing `Article` row has a non-empty `body`.

- [ ] **Step 1: Write the backfill script**

Create `scripts/backfill-body.ts`:

```ts
import "dotenv/config";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// One-time: copy each content/<slug>.mdx body into Article.body, keyed by slug.
// Run once per environment with: npm run backfill:body  (Node 22+)

const CONTENT_DIR = path.join(process.cwd(), "content");

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory — nothing to backfill.");
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { content } = matter(raw);
    const res = await prisma.article.updateMany({
      where: { slug },
      data: { body: content },
    });
    console.log(`${slug}: ${res.count} row(s) updated`);
  }

  const missing = await prisma.article.findMany({
    where: { body: null },
    select: { slug: true },
  });
  if (missing.length > 0) {
    console.error(
      "Articles still missing a body:",
      missing.map((m) => m.slug).join(", "),
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("Backfill complete — all articles have a body.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add after `content:import`:

```json
"backfill:body": "tsx scripts/backfill-body.ts",
```

- [ ] **Step 3: Run the backfill**

Run:
```bash
nvm use 22
npm run backfill:body
```
Expected: a line per article ("<slug>: 1 row(s) updated") and "Backfill complete — all articles have a body." Exit code 0. If it exits 1 listing missing slugs, run `npm run content:import` first (to ensure DB rows exist), then re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-body.ts package.json
git commit -m "chore(db): one-time backfill of Article.body from content files"
```

---

### Task 3: DB read queries for bodies + slugs

**Files:**
- Modify: `src/lib/queries/articles.ts`
- Modify: `src/lib/queries/index.ts`
- Test: `src/lib/queries/articles.test.ts` (create)

**Interfaces:**
- Consumes: `prisma.article`, `ArticleWithContent` (from `@/types`).
- Produces:
  - `getPublicArticleBySlug(slug: string): Promise<ArticleWithContent | null>` — published only.
  - `getPublishedSlugs(): Promise<string[]>`.
  - `getAdminArticleBySlug(slug: string): Promise<ArticleWithContent | null>` — now reads `body` from DB (no file).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/queries/articles.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getPublicArticleBySlug,
  getPublishedSlugs,
} from "@/lib/queries/articles";

const findFirst = vi.mocked(prisma.article.findFirst);
const findMany = vi.mocked(prisma.article.findMany);

const row = {
  id: 1,
  slug: "hello-world",
  title: "Hello World",
  description: "Intro",
  published: true,
  featured: false,
  publishedAt: new Date("2026-06-24"),
  createdAt: new Date("2026-06-24"),
  updatedAt: new Date("2026-06-24"),
  readingTime: 1,
  coverImage: null,
  body: "# Hello\n\nBody text.",
  tags: [{ id: 1, name: "meta", slug: "meta" }],
  categories: [{ id: 1, name: "general", slug: "general" }],
};

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset();
});

describe("getPublicArticleBySlug", () => {
  it("maps body to content and queries published only", async () => {
    findFirst.mockResolvedValue(row as never);
    const result = await getPublicArticleBySlug("hello-world");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "hello-world", published: true } }),
    );
    expect(result?.content).toBe("# Hello\n\nBody text.");
    expect(result).not.toHaveProperty("body");
    expect(result?.title).toBe("Hello World");
  });

  it("returns null when not found", async () => {
    findFirst.mockResolvedValue(null as never);
    expect(await getPublicArticleBySlug("missing")).toBeNull();
  });
});

describe("getPublishedSlugs", () => {
  it("returns slug strings for published articles", async () => {
    findMany.mockResolvedValue([{ slug: "a" }, { slug: "b" }] as never);
    expect(await getPublishedSlugs()).toEqual(["a", "b"]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true }, select: { slug: true } }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/queries/articles.test.ts`
Expected: FAIL — `getPublicArticleBySlug`/`getPublishedSlugs` are not exported.

- [ ] **Step 3: Implement the queries**

In `src/lib/queries/articles.ts`, remove the `readArticleFile` import (line 2) and add these functions. Replace the body-from-file logic in `getAdminArticleBySlug` with the DB column:

```ts
// (remove) import { readArticleFile } from "@/lib/mdx";

const articleInclude = {
  tags: { select: { id: true, name: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
} as const;

export async function getPublicArticleBySlug(
  slug: string,
): Promise<ArticleWithContent | null> {
  const article = await prisma.article.findFirst({
    where: { slug, published: true },
    include: articleInclude,
  });
  if (!article) return null;
  const { body, ...rest } = article;
  return { ...rest, content: body ?? "" };
}

export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await prisma.article.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
```

Rewrite `getAdminArticleBySlug` to read the body column:

```ts
export async function getAdminArticleBySlug(
  slug: string,
): Promise<ArticleWithContent | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: articleInclude,
  });
  if (!article) return null;
  const { body, ...rest } = article;
  return { ...rest, content: body ?? "" };
}
```

- [ ] **Step 4: Export the new queries**

In `src/lib/queries/index.ts`, add `getPublicArticleBySlug` and `getPublishedSlugs` to the `./articles` export block.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/queries/articles.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries/articles.ts src/lib/queries/index.ts src/lib/queries/articles.test.ts
git commit -m "feat(queries): DB body reads — getPublicArticleBySlug, getPublishedSlugs"
```

---

### Task 4: Write path — actions persist `body` to DB

**Files:**
- Modify: `src/lib/actions/article.ts`
- Test: `src/lib/actions/article.test.ts` (create)

**Interfaces:**
- Consumes: `prisma.article`, `calculateReadingTime` (from `@/lib/mdx`), `requireAuth`.
- Produces: `createArticle` / `updateArticle` write `body: data.content`; `togglePublished` / `toggleFeatured` / `deleteArticle` do DB-only mutations (no file sync).

- [ ] **Step 1: Write the failing test**

Create `src/lib/actions/article.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./auth-guard", () => ({ requireAuth: vi.fn().mockResolvedValue({}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    tag: { upsert: vi.fn() },
    category: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { createArticle } from "@/lib/actions/article";

const findUnique = vi.mocked(prisma.article.findUnique);
const create = vi.mocked(prisma.article.create);

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
});

const form = {
  title: "Hello World",
  slug: "hello-world",
  description: "",
  content: "# Hello\n\nBody.",
  published: true,
  featured: false,
  publishedAt: "",
  coverImage: "",
  tagNames: [],
  categoryNames: [],
};

describe("createArticle", () => {
  it("persists the MDX body into the DB and reports success", async () => {
    findUnique.mockResolvedValue(null as never);
    create.mockResolvedValue({ id: 1 } as never);

    const result = await createArticle(form);

    expect(result).toEqual({ ok: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "hello-world", body: "# Hello\n\nBody." }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/actions/article.test.ts`
Expected: FAIL — current `create` payload has no `body` (and the action still imports file helpers).

- [ ] **Step 3: Rewrite the action file**

In `src/lib/actions/article.ts`:

1. Replace the mdx import (line 6) — keep only `calculateReadingTime`:
```ts
import { calculateReadingTime } from "@/lib/mdx";
```
2. Delete the `toFrontmatter` function and the `ArticleFrontmatter` import (no longer used).
3. In `createArticle`, replace the file write + readingTime block with:
```ts
    const readingTime = calculateReadingTime(data.content);

    await prisma.article.create({
      data: {
        slug,
        title: data.title,
        description: data.description || null,
        published: data.published,
        featured: data.featured,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        coverImage: data.coverImage || null,
        readingTime,
        body: data.content,
        tags: { connect: await upsertTags(data.tagNames) },
        categories: { connect: await upsertCategories(data.categoryNames) },
      },
    });
```
4. In `updateArticle`, remove the `deleteArticleFile`/`writeArticleFile` lines and the `frontmatter` variable; compute `readingTime` and add `body` to the update `data`:
```ts
    const readingTime = calculateReadingTime(data.content);
```
and inside `prisma.article.update({ ... data: { … } })` add:
```ts
        body: data.content,
```
5. In `togglePublished` and `toggleFeatured`, delete the "Sync frontmatter" blocks (the `await import("@/lib/mdx")` + `writeArticleFile` lines). Keep only the `prisma.article.update` and `revalidatePath` calls.
6. In `deleteArticle`, remove the `deleteArticleFile(slug)` line; keep `prisma.article.delete`.
7. Add `revalidatePath("/rss.xml");` to `createArticle`, `updateArticle`, `deleteArticle`, and `togglePublished` (alongside the existing `revalidatePath` calls).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/actions/article.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/article.ts src/lib/actions/article.test.ts
git commit -m "feat(admin): write article body to DB, drop file writes"
```

---

### Task 5: Public article page renders from DB (ISR)

**Files:**
- Modify: `src/app/(public)/articles/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublicArticleBySlug`, `getPublishedSlugs` (Task 3).
- Produces: public article page served from DB; `generateStaticParams` from DB; unpublished → `404`.

- [ ] **Step 1: Replace file reads with DB reads**

Rewrite `src/app/(public)/articles/[slug]/page.tsx` imports and data calls:

1. Remove the `@/lib/mdx` import block (`calculateReadingTime`, `getAllArticles`, `readArticleFile`). Add:
```ts
import { getPublicArticleBySlug, getPublishedSlugs } from "@/lib/queries";
```
2. Replace `generateStaticParams`:
```ts
export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}
```
3. In `generateMetadata`, replace `readArticleFile(slug)` with:
```ts
  const article = await getPublicArticleBySlug(slug);
  if (!article) return {};
```
Then read fields from the DB shape: `article.title`, `article.description ?? undefined`, `article.coverImage ?? undefined`, and `article.publishedAt?.toISOString()` (it is a `Date | null`). Build the same `Metadata` object using those values.
4. In the page component, replace the read and the derived values:
```ts
  const article = await getPublicArticleBySlug(slug);
  if (!article) notFound();

  const { title, description, content } = article;
  const tags = article.tags.map((t) => t.name);
  const publishedAtIso = article.publishedAt?.toISOString();
  const date = formatDate(publishedAtIso);
  const readingTime = article.readingTime ?? 1;
```
5. Update the JSX/JSON-LD to use these locals (`title`, `description`, `tags`, `publishedAtIso`, `article.coverImage ?? undefined`) instead of `frontmatter.*`. `extractToc(content)` and `<Mdx source={content} />` stay as-is.

- [ ] **Step 2: Verify build and types**

Run:
```bash
npm run lint
npm run build
```
Expected: lint clean; build succeeds; `/articles/[slug]` listed as a generated route. No reference to `@/lib/mdx` file helpers remains in this file.

- [ ] **Step 3: Verify runtime (logged-out reader)**

Run `npm run dev` (Node 22) and:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/articles/hello-world
```
Expected: `200`. A draft slug returns `404`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/articles/[slug]/page.tsx"
git commit -m "feat(public): render article page from DB with on-demand ISR"
```

---

### Task 6: Tag page static params from DB

**Files:**
- Modify: `src/app/(public)/tags/[tag]/page.tsx`

**Interfaces:**
- Consumes: `getPublicTagsWithCount` (existing, `@/lib/queries`).
- Produces: tag page `generateStaticParams` sourced from DB published tags.

- [ ] **Step 1: Replace the filesystem tag source**

In `src/app/(public)/tags/[tag]/page.tsx`:

1. Remove `import { getAllTags } from "@/lib/mdx";`.
2. Add `getPublicTagsWithCount` to the existing `@/lib/queries` import.
3. Replace `generateStaticParams`:
```ts
export async function generateStaticParams(): Promise<Params[]> {
  const tags = await getPublicTagsWithCount();
  return tags.filter((t) => t.count > 0).map((t) => ({ tag: t.name }));
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds; no `@/lib/mdx` import remains in this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/tags/[tag]/page.tsx"
git commit -m "feat(public): tag page static params from DB"
```

---

### Task 7: RSS feed from DB (async)

**Files:**
- Modify: `src/lib/rss.ts`
- Modify: `src/app/rss.xml/route.ts`
- Test: `src/lib/rss.test.ts`

**Interfaces:**
- Consumes: `getPublicArticles` (existing, `@/lib/queries`).
- Produces: `buildRssXml(): Promise<string>` (now async); route awaits it.

- [ ] **Step 1: Update the test to mock the DB query**

Replace `src/lib/rss.test.ts` entirely:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries", () => ({ getPublicArticles: vi.fn() }));

import { getPublicArticles } from "@/lib/queries";
import { buildRssXml } from "@/lib/rss";

const getPublic = vi.mocked(getPublicArticles);

beforeEach(() => getPublic.mockReset());

describe("buildRssXml", () => {
  it("includes returned articles and is well-formed RSS", async () => {
    getPublic.mockResolvedValue([
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
    const xml = await buildRssXml();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("Hello World");
    expect(xml).toContain("/articles/hello-world");
  });

  it("renders an empty channel when there are no published articles", async () => {
    getPublic.mockResolvedValue([]);
    const xml = await buildRssXml();
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/rss.test.ts`
Expected: FAIL — `buildRssXml` is sync and still imports `@/lib/mdx`.

- [ ] **Step 3: Make `buildRssXml` async + DB-backed**

Rewrite `src/lib/rss.ts`:

```ts
import { Feed } from "feed";
import { getPublicArticles } from "@/lib/queries";
import { site } from "@/lib/site";

/** Render the public RSS 2.0 feed. Published articles only (DB-filtered). */
export async function buildRssXml(): Promise<string> {
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

  for (const article of await getPublicArticles()) {
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

- [ ] **Step 4: Update the route to await**

Rewrite `src/app/rss.xml/route.ts`:

```ts
import { buildRssXml } from "@/lib/rss";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(await buildRssXml(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
```

- [ ] **Step 5: Run test + build**

Run: `npm test -- src/lib/rss.test.ts && npm run build`
Expected: tests PASS; build succeeds; `/rss.xml` route builds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rss.ts src/app/rss.xml/route.ts src/lib/rss.test.ts
git commit -m "feat(rss): build feed from DB; buildRssXml is async"
```

---

### Task 8: Make `body` NOT NULL (Migration B)

**Files:**
- Modify: `prisma/schema.prisma` (Article.body)
- Create: `prisma/migrations/<timestamp>_article_body_required/migration.sql` (generated)

**Interfaces:**
- Consumes: backfill from Task 2 (every row has a body), write path from Task 4 (new rows set body).
- Produces: `Article.body: String` (non-null).

- [ ] **Step 1: Make the field required**

In `prisma/schema.prisma`, change `body String?` to:
```prisma
  body        String
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
nvm use 22
npx prisma migrate dev --name article_body_required
```
Expected: migration applies cleanly (no rows rejected, because all rows were backfilled). If it errors on existing NULLs, stop and re-run Task 2's backfill, then retry.

- [ ] **Step 3: Verify**

Run:
```bash
npx prisma db execute --stdin <<'SQL'
SELECT is_nullable FROM information_schema.columns
WHERE table_name = 'Article' AND column_name = 'body';
SQL
```
Expected: `is_nullable | NO`.

- [ ] **Step 4: Simplify the null-coalescing reads (optional, type-driven)**

Now that `body` is non-null, in `src/lib/queries/articles.ts` the `body ?? ""` fallbacks in `getPublicArticleBySlug` and `getAdminArticleBySlug` can become just `body`. Run `npm test` after to confirm no regressions.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/generated/prisma src/lib/queries/articles.ts
git commit -m "feat(db): make Article.body required after backfill"
```

---

### Task 9: Remove file-based MDX code and content dir

**Files:**
- Modify: `src/lib/mdx.ts` (keep only `calculateReadingTime`)
- Delete: `src/lib/mdx.test.ts`
- Delete: `scripts/import-content.ts`, `scripts/backfill-body.ts`
- Modify: `package.json` (remove `content:import`, `backfill:body` scripts)
- Delete: `content/` directory

**Interfaces:**
- Consumes: nothing new.
- Produces: `@/lib/mdx` exposes only `calculateReadingTime(content: string): number`.

- [ ] **Step 1: Confirm no remaining importers of the file helpers**

Run:
```bash
grep -rn "writeArticleFile\|deleteArticleFile\|readArticleFile\|getAllArticles\|getFeaturedArticles\|getArticlesByTag\|getAllTags\|listArticleSlugs\|articleFileExists\|getArticlePath" src --include=*.ts --include=*.tsx | grep -v "src/lib/mdx.ts"
```
Expected: **no output**. If anything prints, fix that file before continuing (it should have been migrated in Tasks 3–7).

- [ ] **Step 2: Slim down `src/lib/mdx.ts`**

Replace the entire file with just the pure util:

```ts
/**
 * Calculate estimated reading time in minutes (~200 words/minute).
 */
export function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

- [ ] **Step 3: Delete obsolete files and scripts**

Run:
```bash
git rm src/lib/mdx.test.ts scripts/import-content.ts scripts/backfill-body.ts
git rm -r content
```
Then in `package.json`, remove the `"content:import"` and `"backfill:body"` script lines.

- [ ] **Step 4: Full verification**

Run:
```bash
nvm use 22
npm test
npm run lint
npm run build
```
Expected: all tests pass; lint clean; build succeeds with no module-not-found for `content/` or removed exports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(mdx): remove file-based article code and content dir"
```

---

## Self-Review

**Spec coverage:**
- §1 schema change → Task 1 (nullable) + Task 8 (NOT NULL). ✓
- §2 write path (actions, drop YAML/file, toggles, delete) → Task 4. ✓
- §3 read/render (getPublicArticleBySlug, generateStaticParams, notFound, ISR) → Tasks 3, 5. ✓
- §4 consumers (tags, RSS async, admin edit, search no-op) → Tasks 3 (admin edit), 6 (tags), 7 (RSS); search index already DB-based, untouched. ✓
- §5 migration & cutover order → Tasks 1→2→3–7→8→9. ✓
- §6 removal (mdx.ts helpers, content/, import-content) → Task 9. ✓
- §8 drafts published-only + MDX-from-DB note → enforced by `published: true` filter in Task 3; page 404 in Task 5. ✓
- §9 testing (queries, actions, rss update, remove mdx.test) → Tasks 3, 4, 7, 9. ✓
- Added beyond spec: `revalidatePath("/rss.xml")` in actions (Task 4) so the feed updates without deploy — consistent with the goal.

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. ✓

**Type consistency:** `getPublicArticleBySlug`/`getAdminArticleBySlug` return `ArticleWithContent` (maps `body`→`content`, drops `body`); `getPublishedSlugs(): string[]`; `buildRssXml(): Promise<string>` matches awaited route; `calculateReadingTime(content: string): number` used by actions. Names consistent across tasks. ✓

## Execution Handoff

(See post-plan message for execution options.)

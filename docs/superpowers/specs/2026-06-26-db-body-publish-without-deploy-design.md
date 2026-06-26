# Design: DB-backed article bodies (publish without deploy)

**Date:** 2026-06-26
**Status:** Approved (design)
**Topic:** Move article MDX body from `content/*.mdx` files into Postgres so publishing/editing goes live without a Vercel redeploy.

## Problem

Article bodies live as `content/<slug>.mdx` files. Public pages read them at build time
(`generateStaticParams` + `readArticleFile`) and are statically generated. Vercel's serverless
filesystem is **read-only** (only `/tmp`, ephemeral, per-instance), so:

1. The admin save action's `fs.writeFileSync` fails in production (`EROFS`).
2. Even if a file were written, it is not in the build, so SSG pages never serve it.

Result: every new or edited article requires a git commit + push + rebuild. The owner wants to
publish from the running app with **no redeploy**.

## Goal

Create/edit an article in the admin → it is live on the public site within seconds, with no
rebuild. Body is served from Postgres; public pages use on-demand ISR.

## Decisions (locked)

- **Source of truth: DB-only.** Postgres holds the body. The `content/` files and file-based code
  are removed. The `.mdx` files remain in git history if ever needed.
- **Render strategy: on-demand ISR.** Pages stay statically cached; the `revalidatePath` calls
  already present in the save actions regenerate the affected pages on save. New slugs render on
  first visit via default `dynamicParams`.
- **Cleanup: remove file code.** Delete the now-unused file read/write helpers and stop shipping
  `content/` at runtime.

## Architecture

### 1. Schema change — `prisma/schema.prisma`

Add one field to `Article`:

```prisma
body String   // raw MDX source (Postgres TEXT)
```

Rolled out in two migrations to protect existing rows:

1. Add `body` as **nullable**.
2. After backfill, alter to **`NOT NULL`**.

`readingTime` (existing nullable column) continues to be computed from `body` on save.

### 2. Write path — `src/lib/actions/article.ts`

Remove every `writeArticleFile` / `deleteArticleFile` / `readArticleFile` import and call. Replace
with DB writes:

- `createArticle(data)`: include `body: data.content` in `prisma.article.create`. Compute
  `readingTime` from `data.content`.
- `updateArticle(originalSlug, data)`: include `body: data.content` in `prisma.article.update`.
  Slug-rename handling stays (DB `slug` update); no file delete/rewrite.
- `togglePublished(slug)` / `toggleFeatured(slug)`: flip the DB boolean only. Remove the frontmatter
  file-sync blocks entirely.
- `deleteArticle(slug)`: `prisma.article.delete` only; no `deleteArticleFile`.

The `toFrontmatter()` helper and the whole YAML-serialization path are deleted. This removes the
`YAMLException: unacceptable kind of an object to dump` failure mode at its root, so the regression
test added in `src/lib/mdx.test.ts` is removed along with the code it covered.

### 3. Read / render path

New public query in `src/lib/queries/articles.ts`:

```ts
getPublicArticleBySlug(slug): Promise<ArticleWithContent | null>
```

Returns metadata + `body` + `readingTime` for a **published** article only; returns `null` for
unpublished or missing.

`src/app/(public)/articles/[slug]/page.tsx`:

- `generateStaticParams` → published slugs from DB (e.g. `getPublishedSlugs()`).
- `generateMetadata` → `getPublicArticleBySlug(slug)`.
- Page component → `getPublicArticleBySlug(slug)`; `notFound()` if `null`.
- `dynamicParams` stays default (`true`): a brand-new published slug not in the build renders on
  first request, then caches.
- The `Mdx` component is unchanged — it already accepts a string `source`, now sourced from the DB
  column.

On-demand ISR: the page is statically cached. The existing `revalidatePath("/articles/<slug>")`,
`revalidatePath("/")`, `revalidatePath("/articles")`, `revalidatePath("/tags")` calls in the
actions regenerate the relevant pages on save — no per-request re-render, no redeploy.

### 4. Other consumers

- `src/app/(public)/tags/[tag]/page.tsx`: `generateStaticParams` → new `getAllPublicTags()` DB
  query (distinct tag names across published articles).
- `src/lib/rss.ts`: the feed carries metadata only (title, description, date, tags — no body), so
  replace `getAllArticles()` with `getPublicArticles()` (DB). This makes `buildRssXml` **async**;
  update its route caller (`src/app/rss.xml` / `src/app/api/rss`) to `await` it and update
  `rss.test.ts` accordingly.
- `getAdminArticleBySlug` (`src/lib/queries/articles.ts:37`): read `body` from the DB column instead
  of `readArticleFile`.
- Search index (`src/lib/search-index.ts`): already DB-based (`getPublicArticles`) — no change.

### 5. Migration & cutover order

A safe, single-plan sequence:

1. Migration A: add nullable `body` column.
2. One-time backfill script `scripts/backfill-body.ts`: for each `content/*.mdx`, parse with
   `gray-matter`, `UPDATE article SET body = <content> WHERE slug = …`. Verify every published
   article row has a non-empty `body` before proceeding.
3. Switch all reads and writes to the DB (sections 2–4).
4. Migration B: alter `body` to `NOT NULL`.
5. Remove file code and `content/` (section 6).

### 6. Removal

From `src/lib/mdx.ts`, delete: `writeArticleFile`, `deleteArticleFile`, `readArticleFile`,
`getArticlePath`, `articleFileExists`, `listArticleSlugs`, `getAllArticles`, `getFeaturedArticles`,
`getAllTags`, `getArticlesByTag`, `isVisible`, `CONTENT_DIR`. Keep `calculateReadingTime` (pure
util) — used by the save path; relocate to a slim `mdx.ts` or `src/lib/format`.

After backfill, delete the `content/` directory, the `content:import` npm script, and
`scripts/import-content.ts` (superseded by the one-time `backfill-body.ts`). The
`backfill-body.ts` script is itself disposable once the migration has run in every environment.

## Behavior & security notes

- **Drafts:** public URLs serve published articles only; unpublished → `404`. This changes today's
  dev behavior (dev currently shows drafts on public routes via `isVisible`). Draft preview remains
  available in the admin via the existing `MdxPreview`.
- **MDX from DB:** `MDXRemote` compiles MDX at request/regeneration time. Only the single trusted
  admin authors body content, so arbitrary-component execution is an accepted risk for this
  single-author CMS. Noted, not mitigated.

## Testing

- New unit tests (mocked Prisma): `getPublicArticleBySlug`, `getPublishedSlugs`,
  `getAllPublicTags`; action tests asserting `body` is persisted on create/update.
- Update `rss.test.ts` to mock the DB query instead of files.
- Remove the obsolete `src/lib/mdx.test.ts` file-write test.
- `search` / `seo` / `toc` tests unaffected.
- Gates: `npm test` (Node 22), `npm run lint`, `npm run build`, migrations apply.

## Out of scope

Cover-image uploads, a rich text/WYSIWYG editor, multi-author support, in-app body version history
(git history retains the migrated files).

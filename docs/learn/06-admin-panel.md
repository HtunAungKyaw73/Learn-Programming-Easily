# Phase 6 — Admin Panel

> The owner's workspace: create, edit, publish, and delete articles — keeping the `.mdx` files and the database in sync. Built on Server Actions, not API routes.

> ⚠️ **Later evolution:** the "write the `.mdx` file *and* the DB row" sync described here no longer applies. Article bodies now live in PostgreSQL only, and saving publishes live via on-demand revalidation (no file writes, no redeploy) — see [Chapter 10 — DB-Backed Content](10-db-content-migration.md).

## The problem

The owner needs to manage content from a browser, and every save must keep **two stores in agreement**:

- the **`.mdx` file** on disk (the prose, the source of truth), and
- the **database row** (the queryable metadata that powers listings, counts, and filters).

If those drift — an article published in the DB but still a draft in its frontmatter, or a renamed slug that leaves an orphan file — the site shows inconsistent results. The admin's whole job is to make the two move together, atomically *enough*, and to refresh the cached public pages afterward.

## The rationale

| Decision | Why |
|---|---|
| **Server Actions** (not API routes) | A Server Action is a server function you call directly from a component — no fetch, no endpoint wiring, automatic CSRF protection. Forms call them straight. Matches the project convention "Server Actions over API routes where possible." |
| **Write file *and* DB in one action** | Keep the hybrid model consistent at the single point of mutation. |
| **`revalidatePath` after writes** | Public pages are SSG/cached. Explicitly tell Next.js which paths to rebuild so a publish shows up immediately. |
| **Upsert tags/categories by name** | The author types tag names freely; the action creates them if new, reuses them if not — no separate "manage tags" step required to publish. |
| **`(protected)` route group** | Put every real admin page inside `admin/(protected)/` so the layout there enforces auth in one place, while `admin/login` sits *outside* it — structurally killing the redirect-loop risk. |

## What was built

Actions (the mutation layer, [`src/lib/actions/`](../../src/lib/actions)):
- [`article.ts`](../../src/lib/actions/article.ts) — `createArticle`, `updateArticle`, `deleteArticle`, `togglePublished`, `toggleFeatured`.
- [`tag.ts`](../../src/lib/actions/tag.ts), [`category.ts`](../../src/lib/actions/category.ts) — manage taxonomy.
- [`preview.ts`](../../src/lib/actions/preview.ts) — strip frontmatter for the form's live preview.
- [`auth-guard.ts`](../../src/lib/actions/auth-guard.ts) — `requireAuth()` (from Phase 5).

Queries (the read layer, [`src/lib/queries/`](../../src/lib/queries)):
- [`articles.ts`](../../src/lib/queries/articles.ts) — `getAdminArticles`, `getAdminArticleBySlug`, `getArticleStats`, plus the public `getPublicArticles`/`…ByTag`.

Pages & components (under [`src/app/admin/(protected)/`](../../src/app/admin/(protected))):
- Dashboard, article list, new/edit forms, tag & category managers.
- [`components/admin/ArticleForm.tsx`](../../src/components/admin/ArticleForm.tsx), [`TagInput.tsx`](../../src/components/admin/TagInput.tsx), [`DeleteButton.tsx`](../../src/components/admin/DeleteButton.tsx), [`AdminNav.tsx`](../../src/components/admin/AdminNav.tsx).

Plus a sync script: [`scripts/import-content.ts`](../../scripts/import-content.ts).

## How it works

### What a Server Action is

A function with `"use server"` at the top of the file (or inline). You import it into a component and call it like any async function; Next.js turns the call into a POST to the server, runs it there, and returns the result. No API route, no client `fetch`. Every action here returns a discriminated result:

```ts
type ActionResult = { ok: true } | { ok: false; error: string };
```

So the form can branch on `ok` and show the `error` string. And every mutating action starts with `await requireAuth()` — the action-level guard from Phase 5.

### Creating an article — the dual write

[`createArticle`](../../src/lib/actions/article.ts) is the canonical flow:

```ts
await requireAuth();                                  // 1. must be logged in
const slug = data.slug || slugify(data.title);        // 2. derive/validate slug
if (!SLUG_RE.test(slug)) return { ok:false, error:"Slug must be lowercase…" };
if (await prisma.article.findUnique({ where:{ slug }})) return { ok:false, error:"…already exists" };

const frontmatter = toFrontmatter(data);
writeArticleFile(slug, frontmatter, data.content);    // 3a. WRITE THE FILE (source of truth)
await prisma.article.create({                         // 3b. WRITE THE DB ROW (mirror)
  data: { slug, title, …, readingTime,
    tags:       { connect: await upsertTags(data.tagNames) },
    categories: { connect: await upsertCategories(data.categoryNames) } },
});

revalidatePath("/"); revalidatePath("/articles"); revalidatePath("/tags"); …  // 4. refresh cache
return { ok: true };
```

Concepts:
- **Slug validation** via `SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` — slugs are URLs *and* filenames, so they must be clean. Uniqueness is checked against the DB before writing.
- **`toFrontmatter` maps empty fields to `undefined`**, so optional keys are *omitted* from the file (recall the `js-yaml`-dump fix in [Phase 2](02-mdx-pipeline.md)).
- **Upsert-by-name** (`upsertTags`/`upsertCategories`): for each typed name, `prisma.*.upsert` creates it if missing or reuses the existing row, returning `{ id }` for Prisma's `connect`. New tags "just work" at publish time.
- **`revalidatePath`** invalidates the cached static pages so the new article appears immediately on the homepage, the articles list, and tag pages.

### Editing — diffing relations and handling slug changes

[`updateArticle`](../../src/lib/actions/article.ts) is `create` with two extra concerns:

1. **Slug rename.** If the slug changed, it checks the new slug is free, then `deleteArticleFile(originalSlug)` before writing the new file — so a rename doesn't leave an orphan `.mdx`. It also revalidates *both* old and new article paths.
2. **Tag/category diffing.** Rather than disconnect-all-then-reconnect, it computes the delta:

```ts
const toConnectTags    = data.tagNames.filter(n => !currentTagNames.includes(n));
const toDisconnectTags = currentTagNames.filter(n => !data.tagNames.includes(n));
// → tags: { connect: upsert(toConnectTags), disconnect: toDisconnectTags.map(name => ({ name })) }
```

Only what actually changed is touched — minimal writes, clearer intent.

### Toggling publish/featured — keep frontmatter in sync

`togglePublished`/`toggleFeatured` flip the DB boolean **and** rewrite the frontmatter so the file and DB never disagree:

```ts
await prisma.article.update({ where:{ slug }, data:{ published: newPublished }});
const mdx = readArticleFile(slug);
if (mdx) writeArticleFile(slug, { ...mdx.frontmatter, published: newPublished }, mdx.content);
```

This is the dual-write discipline applied even to a one-field change.

### The form & live preview

[`ArticleForm.tsx`](../../src/components/admin/ArticleForm.tsx) is the editor. The "preview" tab calls [`renderMdxPreview`](../../src/lib/actions/preview.ts) — a Server Action that just runs `gray-matter` to strip the frontmatter (it's already shown as form fields) and returns the body for rendering. Small, but note even *preview* is behind `requireAuth()`.

### Reads: admin vs public, from one query file

[`queries/articles.ts`](../../src/lib/queries/articles.ts) holds both sides:
- `getAdminArticles(filter)` — *all* articles (incl. drafts) with relations, for the admin table; supports `all`/`published`/`drafts`.
- `getAdminArticleBySlug(slug)` — merges DB metadata **with the MDX body from disk** into `ArticleWithContent` for the edit form. The hybrid model, made concrete: metadata from the DB, prose from the file.
- `getPublicArticles()` / `…ByTag()` — published-only, mapped into the same `ArticleListItem` shape the filesystem reader produces, so public pages are source-agnostic.

### The import script: filesystem → DB

[`import-content.ts`](../../scripts/import-content.ts) (`npm run content:import`) walks `/content`, reads each file's frontmatter, and **upserts** the matching `Article` + tags + categories. It's **idempotent** — run it repeatedly to bring the DB in line with whatever's on disk. This is how content authored directly in files (bypassing the admin) gets into the database, and how you reconcile after editing `.mdx` by hand.

## Trade-offs & gotchas

- **The dual write isn't a transaction across stores.** The file system and the database are separate systems; if the process died *between* the file write and the DB write, they could diverge. In practice the window is tiny and the import script can reconcile. True two-phase commit would be over-engineering for a single-author CMS — but know the limitation.
- **Frontmatter is the source of truth, the DB is the mirror.** When in doubt (or after hand-editing files), re-run `content:import` to make the DB match the files.
- **`revalidatePath` must list every affected path.** Forget one and that page shows stale content until the next build. That's why the actions revalidate a *set* of paths.
- **No optimistic locking.** Single author, so concurrent edits aren't a concern — but two browser tabs editing the same article could clobber each other.

## Explore it yourself

```bash
npm run dev
# log in at /admin/login, then:
#   /admin               → dashboard stats
#   /admin/articles      → list, toggle publish/featured, delete
#   /admin/articles/new  → create one (watch the .mdx file appear in /content)
npm run content:import   # reconcile DB from the files on disk (needs DB + env)
```

Open:
1. [`src/lib/actions/article.ts`](../../src/lib/actions/article.ts) — the dual write, top to bottom.
2. [`src/lib/queries/articles.ts`](../../src/lib/queries/articles.ts) — admin vs public reads in one place.
3. [`scripts/import-content.ts`](../../scripts/import-content.ts) — the idempotent sync.

→ Next: [Phase 7 — Polish](07-polish.md)

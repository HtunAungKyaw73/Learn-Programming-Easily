# Phase 10 — DB-Backed Content (Publish Without Deploy)

> Move article **bodies** out of `.mdx` files and into PostgreSQL so publishing and editing go live instantly — no rebuild, no redeploy.

> **Reading note:** Chapters 2 and 6 describe the project *as it was first built* — the **hybrid model**, where bodies lived in `/content/*.mdx` files. This chapter is the evolution: it explains why that model broke in production and how the content pipeline moved fully into the database. The earlier chapters are kept as accurate build history; this one supersedes them for *how content is stored today*.

## The problem

The hybrid model ([Chapter 2](02-mdx-pipeline.md)) was lovely in development: bodies were `.mdx` files, version-controlled and IDE-editable, and the admin "saved" an article by writing the file *and* upserting the database row ([Chapter 6](06-admin-panel.md)).

Then it met **Vercel**.

Vercel runs the app on **serverless functions with a read-only filesystem** — only `/tmp` is writable, and that's ephemeral and per-instance. So in production:

1. The admin's `fs.writeFileSync(content/<slug>.mdx, …)` threw `EROFS: read-only file system`. Creating or editing an article from the deployed admin **failed outright**.
2. Even if a file *could* be written, the public pages are statically generated **at build time** from the files bundled into the deployment. A file written at runtime isn't in that bundle, so it would never appear on the site.

The net effect: **every new or edited article required a git commit + push + rebuild.** "Publishing" meant "redeploy." For a CMS whose entire job is publishing, that's the wrong shape.

## The rationale: one source of truth + on-demand ISR

Two decisions, made by working through the trade-offs ([the full design doc](../superpowers/specs/2026-06-26-db-body-publish-without-deploy-design.md)):

1. **Body lives in Postgres, not files.** Add a `body` column to `Article`. The database becomes the **single source of truth** for both body and metadata. The listings were already DB-driven (see [Chapter 6](06-admin-panel.md)); this finishes the job for the body too.

2. **Render with on-demand ISR.** Public pages stay statically cached for speed, but when an article changes, the save action calls `revalidatePath(...)` to **regenerate exactly the affected pages on the next request**. New article → live in seconds, no rebuild.

> **What we gave up:** git-versioned, IDE-editable `.mdx` bodies. **What we gained:** publishing from the running app with no redeploy — the thing the product is actually for. For a single-author CMS where the owner controls deploys, that trade is worth it. (The old `.mdx` files remain in git history if ever wanted.)

The MDX *rendering* didn't change at all: [`Mdx.tsx`](../../src/components/mdx/Mdx.tsx) already took a plain string `source` — it never cared whether that string came from a file or a column.

## What was built

The migration shipped as nine small steps (a safe cutover order), then a fix:

- **Schema** — a `body` column on `Article` ([`prisma/schema.prisma`](../../prisma/schema.prisma)), added **nullable first** so existing rows survived.
- **Backfill** — a one-time script copied each `content/<slug>.mdx` body into its row, then the column was made **`NOT NULL`**.
- **Read queries** — [`getPublicArticleBySlug`](../../src/lib/queries/articles.ts) and `getPublishedSlugs` (published-only; map `body` → `content`); `getAdminArticleBySlug` now reads the body from the column.
- **Write path** — [`src/lib/actions/article.ts`](../../src/lib/actions/article.ts): `createArticle`/`updateArticle` persist `body` to the DB; the file writes (and the YAML frontmatter serialization) are gone.
- **Public render** — [`articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx) reads from the DB; `generateStaticParams` comes from `getPublishedSlugs`; unknown/unpublished slugs `notFound()`.
- **Consumers** — tag pages, the [RSS feed](../../src/lib/rss.ts) (now async), and the search index all read from DB queries.
- **Cleanup** — the file-based helpers and the `/content` directory were deleted; [`src/lib/mdx.ts`](../../src/lib/mdx.ts) is now just `calculateReadingTime`.
- **Revalidation fix** — a final review caught that the publish *toggle* and `/sitemap.xml` weren't being refreshed. All five mutations now funnel through one helper, `revalidatePublicSurfaces(slug?)`.

## How it works

The publish/edit flow, end to end:

```
Owner edits in /admin ──► Server Action (createArticle / updateArticle / togglePublished …)
                              │ 1. requireAuth()
                              │ 2. prisma.article.upsert/update { body, …metadata }
                              │ 3. revalidatePublicSurfaces(slug)
                              ▼
                    revalidatePath("/")  ("/articles")  (`/articles/${slug}`)
                                ("/tags")  ("/rss.xml")  ("/sitemap.xml")  ("/admin*")
                              ▼
   Next.js marks those cached pages stale ──► next visitor triggers a fresh
   render that reads the new row from Postgres ──► live, no redeploy.
```

`revalidatePublicSurfaces` lives at the top of [`src/lib/actions/article.ts`](../../src/lib/actions/article.ts) and is the **one place** the public surface set is defined — so the five actions can't drift out of sync (which is exactly the bug the final review found before this helper existed).

A subtlety: a **brand-new** slug isn't in the static build yet. That's fine — `dynamicParams` (the App Router default) renders it on first visit, then caches it. Existing pages are refreshed by `revalidatePath`.

## Trade-offs & gotchas

- **No more diffable prose.** Bodies aren't in git anymore. For a single author this is acceptable; a multi-author project might want a different answer (e.g. commit-via-GitHub-API).
- **MDX is compiled from the DB at render time.** `next-mdx-remote/rsc` compiles arbitrary MDX, which can execute components. Only the single trusted admin authors it, so this is an **accepted** risk for this app — noted, not mitigated.
- **Revalidation is the load-bearing wall.** The entire "no redeploy" promise rests on `revalidatePath` actually refreshing the static/ISR routes in production. It's wired and passes locally; **confirm it on a real Vercel deploy** (publish an article, watch it appear without a rebuild). This is the one thing local gates can't prove.
- **Drafts are published-only on public routes now.** Unpublished articles `404` publicly (even in dev); preview them in the admin via the live preview.

## Explore it yourself

- Read the design: [`docs/superpowers/specs/2026-06-26-db-body-publish-without-deploy-design.md`](../superpowers/specs/2026-06-26-db-body-publish-without-deploy-design.md) and its [plan](../superpowers/plans/2026-06-26-db-body-publish-without-deploy.md).
- Open [`src/lib/actions/article.ts`](../../src/lib/actions/article.ts) and find `revalidatePublicSurfaces` — trace which paths each action invalidates.
- Compare [`src/lib/queries/articles.ts`](../../src/lib/queries/articles.ts) `getPublicArticleBySlug` with the old file reader in [Chapter 2](02-mdx-pipeline.md) — same `content` string, different origin.
- `git log --oneline e968533..86548b2` — the nine-step cutover plus the revalidation fix.

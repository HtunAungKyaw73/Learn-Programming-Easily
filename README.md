# Learn Programming Easily

**Live:** https://articles.htunaungkyaw.online

A single-author CMS for writing and publishing programming articles. The owner writes posts in an auth-protected admin panel; readers browse a fast, statically-generated public site with search, tags, RSS, and light/dark theming.

The defining design choice is a **database-backed content model**: article **bodies** (raw MDX) and **metadata** (title, slug, tags, publish status, dates) both live in **PostgreSQL**. Creating or editing an article in the admin goes live immediately via on-demand ISR — no rebuild or redeploy. (Vercel's serverless filesystem is read-only, so content cannot be written to disk at runtime.)

> **New here?** Read the guided, phase-by-phase walkthrough in **[`docs/learn/`](docs/learn/README.md)** — it explains every part of the project, including the *problem* each piece solves and the *rationale* behind it.

## Features

- **MDX articles** stored in Postgres, server-rendered, [Shiki](https://shiki.style)-highlighted code (dual light/dark themes).
- **Static public site** (SSG + on-demand ISR) — homepage, article pages, tag index/pages; republished live on edit.
- **Instant client-side search** (Fuse.js, `⌘K`) and an **RSS 2.0 feed** at `/rss.xml`.
- **Admin panel** — create/edit/publish/delete articles via Server Actions writing directly to the database; changes revalidate the public site with no redeploy.
- **Auth** — Auth.js credentials login (single admin), bcrypt-hashed passwords, JWT sessions, DB-backed brute-force rate limiting.
- **SEO** — per-page metadata, canonical URLs, `sitemap.xml`, `robots.txt`, `BlogPosting` JSON-LD, and dynamic Open Graph images.
- **Accessible & responsive** — skip link, focus rings, dialog roles/focus-trap, mobile layouts.
- **Warm-paper editorial design** with semantic color tokens and system-aware dark mode.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` |
| Database | PostgreSQL + Prisma 7 (driver-adapter mode) |
| Content | MDX bodies in Postgres, rendered via `next-mdx-remote/rsc` (`gray-matter` only for admin preview) |
| Auth | Auth.js v5 (`next-auth`), `bcryptjs` |
| Highlighting | Shiki |
| Search | Fuse.js (client-side) |
| RSS | `feed` |
| Tests | Vitest |
| Deploy | Vercel |

## Architecture

```
Reader → Public site (SSG/ISR) ──reads──►  PostgreSQL  (article bodies + metadata)
Owner  → Admin panel (auth)    ──writes──►  PostgreSQL, via Server Actions
                                            └─ revalidatePath publishes live (no redeploy)
```

- Public pages are statically generated and regenerated on-demand (ISR) for SEO and speed.
- The admin panel is dynamic and protected behind auth.
- Saving an article upserts the database row (body + metadata); `revalidatePublicSurfaces()` refreshes the affected public pages, RSS, and sitemap — so edits go live without a redeploy.
- PostgreSQL is the single source of truth for both content and metadata.

See [`CLAUDE.md`](CLAUDE.md) for project conventions and [`docs/learn/`](docs/learn/README.md) for the full tour.

## Getting started

**Prerequisites:** Node **22+** (an [`.nvmrc`](.nvmrc) pins `22.13.1` — run `nvm use`) and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in the values (see below)

# 3. Set up the database
npm run db:generate         # generate the Prisma client
npm run db:migrate          # apply migrations

# 4. Create the admin user (reads ADMIN_EMAIL / ADMIN_PASSWORD)
npm run admin:create

# 5. Run it
npm run dev                 # http://localhost:3000  (admin at /admin)
```

### Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Signs Auth.js sessions — required at runtime (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public site URL, for absolute links in RSS / OG metadata |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin bootstrap — read only by `npm run admin:create` |
| `CRON_SECRET` | Optional; guards the login-attempt sweep cron route on Vercel |

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` / `npm run test:watch` | Run the Vitest suite |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` / `db:deploy` | Apply migrations (dev / prod) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run admin:create` | Create/update the admin user |

## Project structure

```
prisma/                  schema + migrations
docs/learn/              phase-by-phase project guide (start here)
docs/superpowers/        design specs + implementation plans
scripts/                 create-admin
src/
  app/(public)/          public routes (home, articles, tags) — SSG
  app/admin/             protected admin routes (dashboard, CRUD)
  app/api/               auth + cron route handlers
  app/rss.xml, sitemap, robots, opengraph-image   SEO/feed routes
  components/            site/, admin/, article/, mdx/, search/
  lib/                   prisma, mdx, auth, search, rss, seo, toc, actions/, queries/
  types/                 shared TypeScript types
```

## Documentation

- **[`docs/learn/`](docs/learn/README.md)** — guided walkthrough of every phase (problem → rationale → how it works).
- **[`CLAUDE.md`](CLAUDE.md)** — architecture summary and coding conventions.
- **[`docs/superpowers/`](docs/superpowers)** — the design specs and implementation plans the project was built from.

# Learn This Project

A guided, phase-by-phase tour of the **Learn Programming Easily** CMS. These files are written to be *read in order*. Each one explains not just *what* was built, but the **problem** it solves and the **rationale** behind the chosen approach — so you can review the project and understand *why* it looks the way it does.

## How to read these docs

Every chapter follows the same shape:

1. **The problem** — what we needed and what made it hard.
2. **The rationale** — why we chose this approach over the alternatives.
3. **What was built** — the concrete files and pieces.
4. **How it works** — the concepts and the data/control flow.
5. **Trade-offs & gotchas** — what we gave up, and the sharp edges.
6. **Explore it yourself** — files to open and commands to run.

Code references like [`src/lib/mdx.ts`](../../src/lib/mdx.ts) are clickable.

## The 30-second mental model

This is a **single-author CMS** for publishing programming articles. The defining design decision is the **hybrid content model**:

- **Article *body*** lives as **`.mdx` files** in [`/content`](../../content) — version-controlled, editable in your IDE.
- **Article *metadata*** (title, slug, tags, publish status, dates) lives in **PostgreSQL** via Prisma.

The **public site** is statically generated (fast, SEO-friendly). The **admin panel** is a dynamic, auth-protected area where the owner writes articles; saving an article writes the MDX file *and* syncs metadata to the database.

```
                ┌─────────────────────────────────────────────┐
                │                  Reader                     │
                └───────────────────┬─────────────────────────┘
                                    │ visits
                       ┌────────────▼────────────┐
                       │   Public site (SSG)     │  fast, cached, SEO
                       │  / /articles /tags ...  │
                       └────────────┬────────────┘
                          reads     │
              ┌───────────────────┐ │ ┌────────────────────────┐
              │  /content/*.mdx   │◄┘ │  PostgreSQL (Prisma)   │
              │  (article bodies) │   │  (article metadata)    │
              └─────────▲─────────┘   └───────────▲────────────┘
                        │ writes both              │
                       ┌┴──────────────────────────┴┐
                       │   Admin panel (dynamic)     │  auth-protected
                       │   /admin/*  Server Actions  │
                       └────────────▲────────────────┘
                                    │ logs in
                       ┌────────────┴────────────┐
                       │       Owner (you)       │
                       └─────────────────────────┘
```

## The phases

| # | Chapter | What it delivers |
|---|---------|------------------|
| 1 | [Foundation](01-foundation.md) | Next.js + TypeScript + Tailwind scaffold, Prisma schema, the Prisma 7 singleton client |
| 2 | [MDX Pipeline](02-mdx-pipeline.md) | Reading `.mdx` files, frontmatter parsing, Shiki code highlighting, the hybrid content model |
| 3 | [Public Site](03-public-site.md) | Homepage, article pages, tag pages — SSG, routing, layout, components |
| 4 | [Search & RSS](04-search-and-rss.md) | Client-side fuzzy search (Fuse.js), RSS 2.0 feed, the client/server module boundary |
| 5 | [Auth](05-auth.md) | Auth.js credentials login, bcrypt, JWT sessions, route protection, brute-force rate limiting |
| 6 | [Admin Panel](06-admin-panel.md) | CRUD with Server Actions, the MDX↔DB sync, tags/categories management |
| 7 | [Polish](07-polish.md) | App states, SEO (sitemap, JSON-LD, OG images), accessibility & responsiveness |
| 8 | [Design System](08-design-system.md) | The warm-paper editorial look, fonts, light/dark theming |
| 9 | [Table of Contents](09-table-of-contents.md) | Per-article ToC with scroll-spy — a full feature walkthrough |

## Tech stack at a glance

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + `@tailwindcss/typography`
- **Database:** PostgreSQL + Prisma 7 (driver-adapter mode, no Rust engine)
- **Content:** MDX via `next-mdx-remote`, frontmatter via `gray-matter`
- **Auth:** Auth.js v5 (`next-auth` beta) — credentials provider, single admin
- **Code highlighting:** Shiki (build/render-time, dual light/dark theme)
- **Search:** Fuse.js (client-side, fuzzy)
- **RSS:** the `feed` package
- **Tests:** Vitest (run with `npm test`)
- **Deploy target:** Vercel

> **Tooling note:** the toolchain needs **Node 22+**. If you use nvm: `nvm use` (an `.nvmrc` pins the version). Run the test suite with `npm test`, the dev server with `npm run dev`.

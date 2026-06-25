# Phase 1 — Foundation

> Scaffold the app, wire up styling, define the database shape, and stand up a safe database client.

## The problem

Before any feature can exist, you need a skeleton that won't fight you later:

- A **framework** that can statically generate public pages (for SEO and speed) *and* run dynamic, protected admin pages — in one codebase.
- A **type-safe** language so refactors during the later phases don't silently break things.
- A **styling system** that scales without a sprawl of CSS files.
- A **database schema** that models articles, tags, and categories *before* you write code against it — because the shape of your data constrains every query you'll ever write.
- A **database client** that doesn't melt down in development.

That last point is subtle and bites almost everyone, so it gets special attention below.

## The rationale

| Decision | Why |
|---|---|
| **Next.js App Router** | One framework gives both SSG (public) and server-rendered dynamic routes (admin). Server Components + Server Actions remove a lot of API-route boilerplate. |
| **TypeScript everywhere** | The hybrid model passes data between files, DB, and frontmatter. Types catch shape mismatches at compile time. |
| **Tailwind CSS** | Utility classes keep styling colocated with markup; no separate CSS module files to keep in sync. v4 moves config into CSS itself (`@theme`). |
| **PostgreSQL + Prisma** | Relational data (articles ↔ tags ↔ categories are many-to-many) wants a relational DB. Prisma gives a typed client generated from the schema. |

## What was built

- **The Next.js scaffold** — `src/app/` with the App Router, `next.config.ts`, `tsconfig.json`, ESLint config.
- **Tailwind v4 setup** — [`src/app/globals.css`](../../src/app/globals.css) imports Tailwind and declares the design tokens via `@theme` (covered in detail in [Design System](08-design-system.md)).
- **The Prisma schema** — [`prisma/schema.prisma`](../../prisma/schema.prisma).
- **The Prisma client singleton** — [`src/lib/prisma.ts`](../../src/lib/prisma.ts).
- **Shared types** — [`src/types/index.ts`](../../src/types/index.ts).

## How it works

### The database schema

The schema is the contract for all data. Four models matter:

```prisma
model Article {
  id          Int       @id @default(autoincrement())
  slug        String    @unique          // URL identifier, also the .mdx filename
  title       String
  description String?
  published   Boolean   @default(false)  // drafts are hidden on the public site
  featured    Boolean   @default(false)
  publishedAt DateTime?
  readingTime Int?
  coverImage  String?
  tags        Tag[]      @relation("ArticleTags")       // many-to-many
  categories  Category[] @relation("ArticleCategories") // many-to-many
}

model Tag      { id Int @id @default(autoincrement()); name String @unique; slug String @unique; articles Article[] @relation("ArticleTags") }
model Category { id Int @id @default(autoincrement()); name String @unique; slug String @unique; articles Article[] @relation("ArticleCategories") }
```

Key concepts:

- **`slug` is the join key between worlds.** It's the unique DB identifier, the URL path (`/articles/<slug>`), *and* the `.mdx` filename (`<slug>.mdx`). One string ties the database row to the file on disk.
- **Many-to-many relations.** An article has many tags; a tag has many articles. Prisma manages the implicit join tables behind `@relation(...)`.
- **`published` defaults to `false`.** New articles are drafts until you flip the flag — the public site filters on this.

> Two more models — `User` and `LoginAttempt` — are added later in [Auth](05-auth.md). They live in the same schema file but belong conceptually to that phase.

### The Prisma client singleton — and *why it matters*

This is the most important 19 lines in the foundation:

```ts
// src/lib/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**The problem it solves:** In development, Next.js hot-reloads your modules on every file save. A naïve `export const prisma = new PrismaClient()` would construct a *brand-new* client — and a new database connection pool — on every reload. Within minutes you exhaust Postgres's connection limit and everything errors with "too many connections."

**The fix:** stash the client on the `globalThis` object. `globalThis` survives hot reloads (module code re-runs, but the global object persists). So `globalForPrisma.prisma ?? createPrismaClient()` reuses the existing client if one is already there. In production there's no hot reload, so we skip caching it on the global.

**The Prisma 7 wrinkle:** Prisma 7 runs *without* its Rust query engine, using a **driver adapter** instead. That's why you see `new PrismaPg({ connectionString })` — the connection string lives on the **adapter**, not on the `PrismaClient` constructor. The generated client is imported from `@/generated/prisma/client` (a project-local path set by `output` in the schema), not from `@prisma/client`.

### The shared types

[`src/types/index.ts`](../../src/types/index.ts) defines the shapes that flow between layers — most importantly:

- `ArticleFrontmatter` — the YAML block at the top of each `.mdx` file.
- `ArticleListItem` — a lightweight `{ slug, frontmatter, readingTime }` used by listing pages.
- `ArticleMeta` / `ArticleWithContent` — the DB-backed shapes used by the admin.

Having these named once means the MDX reader, the DB queries, and the React components all agree on what an "article" looks like.

## Trade-offs & gotchas

- **The DB isn't provisioned in this repo by default.** The project is "filesystem-first": you can build and render public pages from MDX files *without a live database* (see the MDX reader's dev fallbacks in the next chapter). You only need Postgres running once you exercise the DB-backed paths (admin, DB-driven listings). Set `DATABASE_URL` in `.env`.
- **Node 22+ is required** for the Prisma CLI and tooling. An `.nvmrc` pins it.
- **The generated client lives in `src/generated/prisma/`** and is committed/regenerated via `npm run db:generate`. Don't hand-edit it.

## Explore it yourself

```bash
npm install            # install deps (Node 22+)
npm run db:generate    # regenerate the Prisma client from the schema
npm run dev            # start the dev server
```

Open, in order:
1. [`prisma/schema.prisma`](../../prisma/schema.prisma) — the data contract.
2. [`src/lib/prisma.ts`](../../src/lib/prisma.ts) — the singleton, and the comments explaining the adapter.
3. [`src/types/index.ts`](../../src/types/index.ts) — the shapes everything shares.

→ Next: [Phase 2 — MDX Pipeline](02-mdx-pipeline.md)

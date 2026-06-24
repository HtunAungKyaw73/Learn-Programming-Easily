# Project: Programming Articles CMS

A content management system for writing and publishing programming articles. The owner writes and posts articles; readers browse the public site.

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Content:** MDX files in `/content` directory (hybrid: body in files, metadata in DB)
- **Auth:** Auth.js (credentials provider — single admin user)
- **Syntax Highlighting:** Shiki
- **Search:** Fuse.js (client-side)
- **RSS:** `feed` npm package
- **Deployment:** Vercel

## Architecture

- Public pages are statically generated (SSG) for SEO and performance
- Admin panel is dynamic, protected behind auth
- Article body lives as `.mdx` files in `/content/` (version-controlled, IDE-editable)
- Article metadata (title, slug, tags, categories, publish status, dates) lives in PostgreSQL
- Admin panel can create/edit MDX files and sync metadata to the database

## Project Structure

- `content/` — MDX article files
- `prisma/` — database schema and migrations
- `src/app/(public)/` — public-facing routes (homepage, articles, tags)
- `src/app/admin/` — protected admin routes (dashboard, CRUD)
- `src/app/api/` — API routes (auth, CRUD, RSS)
- `src/components/` — React components (public/, admin/, ui/)
- `src/lib/` — utilities (prisma client, auth config, MDX parsing, search, RSS)
- `src/types/` — shared TypeScript types

## Conventions

- Use TypeScript for all files
- Use Tailwind CSS for styling — no CSS modules or styled-components
- Use Server Components by default; add `"use client"` only when needed
- Use Server Actions for form mutations instead of API routes where possible
- Keep MDX frontmatter schema consistent (title, description, tags, published, featured, publishedAt, coverImage)
- Use `gray-matter` to parse frontmatter, `next-mdx-remote` or `@next/mdx` to render
- Prisma client should be a singleton (avoid hot-reload connection exhaustion)
- All public pages should have proper meta tags for SEO
- Dark/light mode support via Tailwind's dark variant

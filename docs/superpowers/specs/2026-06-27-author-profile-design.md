# Author Profile (Public Site) — Design

**Date:** 2026-06-27
**Status:** Approved — content resolved (2026-06-27)
**Scope:** Add an author profile to the public site in three surfaces — a dedicated `/about` page, a per-article author card, and a homepage author intro — backed by a single author config. Widen the shared container so the new nav item fits. Single-author blog; no DB or multi-author support.

## Goal

Give readers a way to learn who writes the blog and follow the author, from three entry points (a canonical About page, the bottom of every article, and the homepage), all driven by one source of truth in `site.ts`.

## Decisions (locked)

- **Surfaces:** ship all three — **A** `/about` page, **B** per-article author card, **C** homepage author intro. Confirmed by owner.
- **Container width:** widen the shared `Container` from `max-w-3xl` (768px) → **`max-w-4xl` (896px)**, globally (header, footer, every page, article reading column stay aligned as established in the layout-width refactor). Reason: adding an "About" nav item crowds the `max-w-3xl` header.
- **Avatar:** owner provides a real image (dropped in `public/`, e.g. `public/author.jpg`). Rendered via `next/image`.
- **Data source:** one `author` object in `src/lib/site.ts`. No DB table, no admin UI for it (single-author, edited in config). Keeps with the existing `site` config pattern.
- **Reused component:** one `AuthorCard` component drives surfaces B and C (variant prop); the `/about` page renders a fuller layout that reuses the same data + avatar + socials.
- **Socials:** inline SVG icons (project convention — no icon lib). Only render the platforms the owner supplies a URL for.
- **Out of scope:** multiple authors, author DB model, follower/subscribe, comments, editing the profile from the admin panel.

## Owner inputs — RESOLVED (2026-06-27)

1. **Avatar:** `public/author.jpg` (956×960 JPEG) → `avatar: "/author.jpg"`.
2. **Bio:**
   - `bioShort`: "Full-stack developer who turns complex problems into simple, intuitive designs."
   - `bioLong`: "I'm a developer with a strong foundation in both front-end and back-end technologies. I enjoy turning complex problems into simple, beautiful, and intuitive designs. I love to learn new things and am always looking to expand my skillset."
3. **Tagline:** N/A — omit `tagline`.
4. **Socials** (3, in order):
   - github → `https://github.com/HtunAungKyaw73`
   - linkedin → `https://www.linkedin.com/in/htun-aung-kyaw-385285352/`
   - email → `mailto:htunaungkyaw730@gmail.com`
   - (GitHub profile also lists a portfolio `https://htunaungkyaw-portfolio.vercel.app/` — excluded per owner; add a `website` social later if wanted.)

**Name:** `Htun Aung Kyaw` (unchanged from current `site.author`).

## Data model — `src/lib/site.ts`

Extend the existing `site` config with an `author` object (replaces the bare `author: "Htun Aung Kyaw"` string; keep `site.author` as a derived convenience or update its 3 current consumers — see Migration):

```ts
export type SocialPlatform =
  | "github"
  | "twitter"
  | "linkedin"
  | "email"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  /** Full URL, or mailto: for email. */
  href: string;
}

export interface Author {
  name: string;
  /** Short role/tagline shown under the name. */
  tagline?: string;
  /** One-line bio for the article card + homepage intro. */
  bioShort: string;
  /** Longer bio (2–4 sentences) for the /about page. */
  bioLong: string;
  /** Path under /public, e.g. "/author.jpg". */
  avatar: string;
  socials: SocialLink[];
}
```

`site.author` is currently a **string** used in **6 spots across 4 files** (verified by grep): `app/layout.tsx:36`, `app/(public)/articles/[slug]/page.tsx:34` + `:68`, `components/site/Footer.tsx:9`, `lib/rss.ts:13` + `:14`. (The OpenGraph image routes use `site.name`, not `site.author`.) Migration: rename the object to `site.author` and update all 6 consumers to `site.author.name`.

## Components & files

### 1. `src/lib/site.ts` — author config (modify)

Add the `Author`/`SocialLink` types + the `author` object. Update string consumers to `site.author.name`.

### 2. `src/components/site/Container.tsx` — width (modify)

`max-w-3xl` → `max-w-4xl`. Single-line change; cascades to header, footer, all pages.

### 3. `src/app/(public)/articles/[slug]/page.tsx` — TOC gutter (modify)

**Constraint introduced by the width change.** The article TOC floats in the right gutter via `absolute left-full ml-8 w-52` and shows at `xl` (≥1280px). Widening the container to 896px shrinks the side gutters: the TOC needs `left-full + ml-8(32) + w-52(208) = 240px` of right gutter, which requires viewport ≥ `896 + 480 = 1376px`. So the float must gate at **≥1376px**, not `xl`(1280). Change the aside's `xl:block` → a `min-[1376px]:block` (and the inline `<details>` disclosure's `xl:hidden` → `min-[1376px]:hidden`) so between 1280–1375px readers get the inline Contents disclosure instead of an overflowing sidebar.

### 4. `src/components/site/SocialLinks.tsx` — social icons (create)

Presentational. Takes `socials: SocialLink[]`, renders a row of icon links with inline SVGs (GitHub, X, LinkedIn, mail, globe). Each: `aria-label` = platform, `title`, `rel="noopener noreferrer"`, external links `target="_blank"` (email = `mailto:`, no target). 32px hit area, `text-muted hover:text-terracotta`, `cursor-pointer`. Icons use `currentColor`.

### 5. `src/components/site/AuthorCard.tsx` — shared card (create)

Drives surfaces B and C. Props:

```ts
{ variant?: "article" | "home"; className?: string }
```

Layout: avatar (`next/image`, rounded-full, `~56px`), name (font-display), tagline (text-faint), `bioShort` (text-muted), `<SocialLinks />`. `variant="article"` = bordered `bg-surface` card with a "Written by" eyebrow + a "More about me →" link to `/about`. `variant="home"` = lighter inline treatment (no border) for the hero. Both pull from `site.author`.

### 6. `src/app/(public)/about/page.tsx` — About page (create)

Static route in the `(public)` group (inherits header/footer). Renders inside `<Container>`: large avatar, name + tagline, `bioLong`, `<SocialLinks />`. `export const metadata` with title "About" + description from `bioShort`. Optional: `Person` JSON-LD with `sameAs: socials[].href` (mirrors existing `articleJsonLd` pattern in `lib/seo.ts`).

### 7. `src/lib/site.ts` nav — About link (modify)

Add `{ label: "About", href: "/about" }` to `site.nav` (currently Articles, Tags). Header maps `site.nav`, so the link appears automatically; active-state styling already handled.

### 8. Homepage intro — `src/app/(public)/page.tsx` (modify)

Render `<AuthorCard variant="home" />` in/after the hero section (below the description, above the article list divider).

### 9. Article page card — `src/app/(public)/articles/[slug]/page.tsx` (modify)

Render `<AuthorCard variant="article" />` after the `<Mdx />` body, inside the `<article>` (so it sits within the reading column, above the closing tag).

## SEO & accessibility

- About page: proper `metadata` (title/description), canonical; optional `Person` JSON-LD with `sameAs`.
- Avatar `alt` = author name. Decorative icons `aria-hidden`; icon links carry `aria-label`.
- Social/contrast: terracotta-on-paper and hover states already meet AA in the design system; reuse tokens, no new colors.
- `next/image` for the avatar: set explicit `width`/`height` to avoid CLS; image lives in `/public`.

## Migration / risk notes

- **`site.author` string → object** is a breaking shape change. 6 consumers to update to `site.author.name`: `app/layout.tsx:36`, `app/(public)/articles/[slug]/page.tsx:34` + `:68`, `components/site/Footer.tsx:9`, `lib/rss.ts:13` + `:14`. Grep `site.author` before/after to confirm zero string uses remain.
- **Container 4xl tradeoff:** the article reading column widens 768→896px (~90–100 chars/line — wider than the 65–75 ideal). Accepted by owner for the nav-space win. If it reads too wide post-build, a follow-up can cap the prose column at `max-w-3xl` while keeping chrome at 4xl (left-aligned), but that reopens the alignment question — out of scope here.
- **TOC gutter** handled in component 3; verify no horizontal overflow at 1280, 1376, 1536px.

## Verification

- `npx eslint` + `npx tsc --noEmit` clean on all touched files.
- Preview (public, no auth): homepage intro renders; `/about` renders; article card renders at bottom of a post; About nav link present + active styling; avatar loads (no broken image / CLS).
- Width: measure header / content / footer share the same left/right edges at 4xl (as the layout-width refactor verified at 3xl).
- TOC: at 1280px → inline Contents disclosure (no sidebar overflow); at ≥1376px → gutter sidebar, no horizontal scroll.
- Dark mode: avatar, card border, social icons legible.
- Mobile (375px): card stacks, no overflow, avatar sized sensibly.

## File summary

| File | Action |
|------|--------|
| `src/lib/site.ts` | author object + types; nav About link; string→`.name` |
| `src/components/site/Container.tsx` | `max-w-3xl` → `max-w-4xl` |
| `src/components/site/SocialLinks.tsx` | create |
| `src/components/site/AuthorCard.tsx` | create |
| `src/app/(public)/about/page.tsx` | create |
| `src/app/(public)/page.tsx` | homepage intro |
| `src/app/(public)/articles/[slug]/page.tsx` | author card + TOC gutter breakpoint |
| `src/app/layout.tsx`, `src/app/(public)/articles/[slug]/page.tsx`, `src/components/site/Footer.tsx`, `src/lib/rss.ts` | `site.author` → `site.author.name` (6 spots) |
| `public/<avatar>` | owner-provided image |

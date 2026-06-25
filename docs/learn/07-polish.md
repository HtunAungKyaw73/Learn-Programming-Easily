# Phase 7 — Polish

> The difference between "it works" and "it ships." Loading/error/empty states, full SEO (sitemap, structured data, social cards), accessibility, and responsiveness. Delivered as four focused slices.

## The problem

A feature-complete site still isn't production-ready until:

- **Every state is handled** — what shows while data loads, when something errors, when a list is empty?
- **Search engines and social platforms understand it** — sitemap, canonical URLs, structured data, share images.
- **Everyone can use it** — keyboard users, screen-reader users, sufficient color contrast.
- **It works on a phone** — not just a wide desktop.

These are easy to skip and expensive to retrofit. Phase 7 does them deliberately, split into reviewable slices:

| Slice | Plan |
|---|---|
| App states | [`2026-06-24-phase7-app-states.md`](../superpowers/plans/2026-06-24-phase7-app-states.md) |
| Auth hardening | [`2026-06-25-phase7-auth-hardening.md`](../superpowers/plans/2026-06-25-phase7-auth-hardening.md) (the rate-limit work, see [Phase 5](05-auth.md)) |
| SEO | [`2026-06-25-phase7-seo.md`](../superpowers/plans/2026-06-25-phase7-seo.md) |
| A11y & responsive | [`2026-06-25-phase7-a11y-responsive.md`](../superpowers/plans/2026-06-25-phase7-a11y-responsive.md) |

## The rationale

| Decision | Why |
|---|---|
| **Use the App Router's file conventions for states** | `loading.tsx`, `error.tsx`, `not-found.tsx` are built-in slots — Next.js shows them automatically. Don't hand-roll spinners. |
| **Metadata API + route handlers for SEO** | `generateMetadata`, `sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` are first-class. Use them instead of stuffing tags by hand. |
| **Pure builder functions for SEO data** | Put the *logic* (sitemap shape, JSON-LD) in plain, testable functions; the routes just call them. |
| **Bake a11y into components, not as an afterthought** | Skip links, focus rings, roles, and arrow-key nav live in the components themselves. |

## What was built

**App states** (App Router conventions):
- [`(public)/error.tsx`](../../src/app/(public)/error.tsx), [`admin/(protected)/error.tsx`](../../src/app/admin/(protected)/error.tsx), [`global-error.tsx`](../../src/app/global-error.tsx) — error boundaries.
- [`not-found.tsx`](../../src/app/not-found.tsx) — 404.
- [`admin/(protected)/loading.tsx`](../../src/app/admin/(protected)/loading.tsx) — loading UI.
- [`components/site/ErrorState.tsx`](../../src/components/site/ErrorState.tsx) — shared empty/error presentation. (Empty states also live inline, e.g. the homepage's "No articles yet.")

**SEO:**
- [`src/lib/seo.ts`](../../src/lib/seo.ts) — `buildSitemap()` and `articleJsonLd()` (pure, tested).
- [`src/app/sitemap.ts`](../../src/app/sitemap.ts), [`src/app/robots.ts`](../../src/app/robots.ts) — the routes.
- [`src/app/opengraph-image.tsx`](../../src/app/opengraph-image.tsx) + [`(public)/articles/[slug]/opengraph-image.tsx`](../../src/app/(public)/articles/[slug]/opengraph-image.tsx) — dynamic social cards.
- `generateMetadata` in the root layout and article page; `articleJsonLd` injected as a `<script type="application/ld+json">`.

**A11y & responsive:**
- Skip link + `focus-visible` rings (in `layout.tsx` and `globals.css`).
- Search dialog: roles, focus trap, arrow-key nav, return-focus.
- Responsive header: short wordmark + icon-only search on mobile.

## How it works

### App states via file conventions

The App Router reserves filenames as UI slots:

- **`loading.tsx`** — shown automatically while an async Server Component on that route is fetching (it's a Suspense fallback under the hood).
- **`error.tsx`** — a Client Component error boundary; if rendering throws, this renders instead, with a `reset()` to retry. There's one for the public area and one for admin.
- **`global-error.tsx`** — the last-resort boundary wrapping the root layout itself.
- **`not-found.tsx`** — rendered whenever code calls `notFound()` (e.g. an unknown article slug).

**Concept:** you don't wire these up — you just create the file and Next.js slots it in. Empty states (no articles, no search results) are plain conditionals in the components, e.g. the homepage renders "No articles yet" when the list is empty.

### SEO: logic in functions, plumbing in routes

The pattern is consistent — a **pure builder** in `seo.ts`, a **thin route** that supplies real data:

**Sitemap.** [`buildSitemap(baseUrl, articles, tags)`](../../src/lib/seo.ts) returns static routes + one entry per published article + one per tag. [`sitemap.ts`](../../src/app/sitemap.ts) feeds it live data. Because the logic is a separate pure function, it's unit-tested without spinning up a server.

**Structured data (JSON-LD).** [`articleJsonLd(...)`](../../src/lib/seo.ts) builds a schema.org `BlogPosting` object — and *omits absent optionals* so you never emit empty fields:

```ts
const ld = { "@context":"https://schema.org", "@type":"BlogPosting", headline, url, author };
if (a.description) ld.description = a.description;
if (a.publishedAt) ld.datePublished = a.publishedAt;
if (a.coverImage)  ld.image = a.coverImage;
if (a.tags?.length) ld.keywords = a.tags.join(", ");
```

The article page serializes this into a `<script type="application/ld+json">`. **Why:** structured data lets Google show rich results (author, date) for your articles.

**Per-page metadata.** `generateMetadata` on the article route sets the title, description, **canonical URL** (`alternates.canonical`), and Open Graph fields. The root layout sets site-wide defaults and a title `template` (`%s · Learn Programming Easily`), plus the RSS `<link>`. Canonical URLs matter because SSG can otherwise be reached by multiple paths; the canonical tag tells crawlers the One True URL.

### Dynamic Open Graph images

[`opengraph-image.tsx`](../../src/app/(public)/articles/[slug]/opengraph-image.tsx) generates a **1200×630 PNG per article at request time** using `next/og`'s `ImageResponse` — you write JSX, it renders an image. It pulls the article's title and first category from the DB, draws them on the warm-paper background in the Fraunces display font ([loaded via `og-font.ts`](../../src/lib/og-font.ts)), and falls back to the site name if the article is missing.

**Why dynamic:** every article gets a branded, on-theme share card automatically — no manual image work, and the card always matches the current title.

### Accessibility, concretely

- **Skip link** (`layout.tsx`): hidden until focused, jumps to `#main` — keyboard users skip the nav.
- **`:focus-visible` rings** (`globals.css`): a clear terracotta outline for anything that doesn't style its own focus — keyboard navigation is *visible*.
- **AA contrast:** the `--faint` token was darkened to meet WCAG AA contrast (`feat(a11y): … AA-contrast faint token`).
- **Search dialog** ([`Search.tsx`](../../src/components/search/Search.tsx)): `role="dialog"`, focus is trapped inside while open, ↑/↓ move the active result (via the tested `nextActiveIndex` helper), and focus returns to the trigger on close.

### Responsive

The header ([`Header.tsx`](../../src/components/site/Header.tsx)) swaps the full wordmark for the short `LPE` on small screens (`sm:hidden` / `hidden sm:inline`) and uses icon-only search on mobile, keeping the bar uncluttered. Reading width is capped by `Container`; the article ToC rail only appears at the `xl` breakpoint ([Phase 9](09-table-of-contents.md)).

## Trade-offs & gotchas

- **OG image generation runs on the Node runtime and hits the DB** (`export const runtime = "nodejs"`). It's per-request work; fine at this scale, but it's not free.
- **`metadataBase` must be set** (it is, in the root layout) or relative OG/canonical URLs resolve wrong.
- **Error boundaries are Client Components** (`"use client"`) — they can't directly read server-only data; they present what they're handed.
- **Some Phase 7 polish is verification-by-eye** — responsive breakpoints, light/dark, and the ToC rail want a real browser check, not just a passing test.

## Explore it yourself

```bash
npm test     # seo.test.ts (sitemap + JSON-LD builders)
npm run dev
curl http://localhost:3000/sitemap.xml
curl http://localhost:3000/robots.txt
# open an article and view source → find the application/ld+json script
# visit /articles/<slug>/opengraph-image  → the generated PNG
```

Open:
1. [`src/lib/seo.ts`](../../src/lib/seo.ts) — pure builders.
2. [`src/app/(public)/articles/[slug]/opengraph-image.tsx`](../../src/app/(public)/articles/[slug]/opengraph-image.tsx) — JSX → PNG.
3. [`src/app/(public)/layout.tsx`](../../src/app/(public)/layout.tsx) — the skip link.

→ Next: [Phase 8 — Design System](08-design-system.md)

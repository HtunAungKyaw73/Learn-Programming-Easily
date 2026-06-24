# Phase 7 (Slice 3) — SEO Finishing — Design

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Third Phase 7 slice. Complete the SEO/social surface: `sitemap.xml`, `robots.txt`, BlogPosting JSON-LD, dynamic OG cards, and refined per-article metadata. Public only; no data/admin changes.

## Goal

Make the statically-generated public site fully crawlable and shareable: a sitemap + robots for crawlers, structured data for rich results, and branded Open Graph cards for social.

## Decisions (locked)

- **JSON-LD type:** `BlogPosting`.
- **OG cards:** dynamic via `next/og` `ImageResponse`, warm-paper, title in Fraunces from a committed static `.ttf` (graceful fallback to the built-in sans if the file fails to load).
- **Pure builders** (`buildSitemap`, `articleJsonLd`) live in `src/lib/seo.ts` and are unit-tested (via the `test-feature` workflow).
- Robots **disallows `/admin`**; allows the rest.
- No new runtime npm deps (`next/og` ships with Next).

## Components

### `src/lib/seo.ts` (pure, tested)

```ts
import type { MetadataRoute } from "next";

export interface SitemapArticle { slug: string; publishedAt?: string }
export interface SitemapTag { name: string }

// Static routes + one entry per published article + one per tag.
export function buildSitemap(
  baseUrl: string,
  articles: SitemapArticle[],
  tags: SitemapTag[],
): MetadataRoute.Sitemap;

export interface JsonLdInput {
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  tags?: string[];
  coverImage?: string;
  authorName: string;
  baseUrl: string;
}

// BlogPosting structured data for one article.
export function articleJsonLd(a: JsonLdInput): Record<string, unknown>;
```

- `buildSitemap`: entries for `/`, `/articles`, `/tags` (lastModified = now), then `${baseUrl}/articles/${slug}` (lastModified = `publishedAt` when present) and `${baseUrl}/tags/${encodeURIComponent(name)}`.
- `articleJsonLd`: `{ "@context": "https://schema.org", "@type": "BlogPosting", headline, description?, datePublished?, author: { "@type": "Person", name }, url, image? (coverImage), keywords? (tags joined) }`. Omits absent optionals.

### `src/app/sitemap.ts`

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { ... }
```
Calls `getPublicArticles()` + `getPublicTagsWithCount()`, maps to the builder's input shapes, returns `buildSitemap(site.url, ...)`.

### `src/app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
```

### Article page — `src/app/(public)/articles/[slug]/page.tsx` (modify)

- In `generateMetadata`: add `alternates: { canonical: \`/articles/${slug}\` }`, `openGraph.type: "article"`, `openGraph.publishedTime` (from `publishedAt`), `authors: [site.author]`. (OG image is auto-attached by the `opengraph-image` convention.)
- In the page body: render `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd({...})) }} />` (a `<script>` with stringified JSON is the standard, safe injection for structured data).

### Dynamic OG cards

`src/app/(public)/articles/[slug]/opengraph-image.tsx`:
- Exports `alt`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"`.
- `Image({ params })`: await `params`, query the article's `title` (+ first category as a kicker) by slug via `prisma`. Render an `ImageResponse`: bg `#fbf6ec`, a terracotta (`#a23b2c`) kicker/rule, the title in Fraunces (`#2a2017`, ~64px, clamped lines), and `site.name` footer in muted (`#5e5343`).
- Font: `try { readFile(join(process.cwd(), "assets/Fraunces-SemiBold.ttf")) }`; pass `fonts: [{ name: "Fraunces", data, weight: 600, style: "normal" }]` only when loaded — otherwise omit `fonts` (built-in sans).
- Unknown slug → render a generic site card (don't throw).

`src/app/opengraph-image.tsx`:
- Site-level default card (home/listings): same palette, `site.name` + tagline. Same font handling.

`assets/Fraunces-SemiBold.ttf`:
- A committed **static** Fraunces instance (~weight 600). Sourced once during implementation (e.g. google-webfonts-helper). New tracked binary (a few hundred KB).

## Data flow

```
getPublicArticles() / getPublicTagsWithCount()  ──> sitemap.ts ──buildSitemap──> /sitemap.xml
site config ──> robots.ts ──> /robots.txt
article frontmatter ──articleJsonLd──> <script ld+json> in article page
prisma (title by slug) + Fraunces ttf ──ImageResponse──> /articles/<slug>/opengraph-image
```

## Error / edge handling

- Empty DB → sitemap still emits the 3 static routes; robots unaffected.
- Missing `publishedAt` → sitemap entry omits `lastModified`; JSON-LD omits `datePublished`.
- Missing cover image → JSON-LD omits `image`; OG card unaffected (it's generated, not the cover).
- Font file missing/unreadable → OG card renders in the default sans (still a valid PNG).
- Unknown slug to the OG route → generic card, HTTP 200 (no 500).

## Testing (TDD via the `test-feature` workflow)

**`src/lib/seo.test.ts`** (pure, no mocks):
- `buildSitemap`: includes the 3 static routes; one entry per article with the right `/articles/<slug>` URL and `lastModified` from `publishedAt`; one per tag with an encoded `/tags/<name>` URL; total count = 3 + articles + tags.
- `articleJsonLd`: `@type` is `BlogPosting`; `headline`/`url`/`author.name` correct; `datePublished`/`image`/`keywords` present when inputs given and **absent** when not.

**Gates:** `npm test` (suite grows), `npm run build` (sitemap/robots/og routes compile; OG image generation succeeds), `npm run lint` clean. Manual: fetch `/sitemap.xml`, `/robots.txt`, and `/articles/hello-world/opengraph-image` (a PNG renders).

## Out of scope (later / future)

- Accessibility & responsive — slice 4.
- Per-article hand-authored OG images; multiple JSON-LD types (BreadcrumbList, WebSite); RSS-in-sitemap; i18n/hreflang.
- `updatedAt`-based `lastModified` (the public query returns `publishedAt`; using it is sufficient).

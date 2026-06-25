# Phase 3 — Public Site

> The reader-facing pages: homepage, article pages, tag index and tag pages — statically generated, with shared layout and components.

## The problem

Readers need to:

- Land on a **homepage** that lists articles.
- Read an **article** at a clean URL (`/articles/<slug>`).
- Browse **by tag** (`/tags`, `/tags/<tag>`).

And it all needs to be **fast** and **SEO-friendly** — search engines and social cards should see fully-formed HTML, not a spinner. For a content site, this is non-negotiable: performance and crawlability *are* the product.

## The rationale

| Decision | Why |
|---|---|
| **Static Site Generation (SSG)** | Article content changes rarely. Pre-render pages to HTML at build time → instant loads, trivially cacheable on a CDN, perfect for crawlers. |
| **Route groups `(public)`** | Next.js lets you group routes in folders wrapped in parentheses without affecting the URL. `(public)` gets its own `layout.tsx` (header/footer/skip-link) separate from `/admin`. |
| **A shared `Container`** | Header, footer, and page content must align to one column width. A single `Container` component is the one place that width is defined. |
| **Server Components by default** | Pages fetch data and render on the server; no client JS unless a piece is interactive (search, theme toggle). |

## What was built

Routes (all under [`src/app/(public)/`](../../src/app/(public))):

| URL | File | Renders |
|---|---|---|
| `/` | [`page.tsx`](../../src/app/(public)/page.tsx) | Homepage — hero + article list |
| `/articles` | [`articles/page.tsx`](../../src/app/(public)/articles/page.tsx) | All published articles |
| `/articles/<slug>` | [`articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx) | One article (the big one) |
| `/tags` | [`tags/page.tsx`](../../src/app/(public)/tags/page.tsx) | Tag index |
| `/tags/<tag>` | [`tags/[tag]/page.tsx`](../../src/app/(public)/tags/[tag]/page.tsx) | Articles for one tag |

Shared chrome & components:

- [`(public)/layout.tsx`](../../src/app/(public)/layout.tsx) — skip link, `<Header>`, `<main>`, `<Footer>`, view-transition wrapper.
- [`components/site/Header.tsx`](../../src/components/site/Header.tsx), [`Footer.tsx`](../../src/components/site/Footer.tsx), [`Container.tsx`](../../src/components/site/Container.tsx), [`ArticleCard.tsx`](../../src/components/site/ArticleCard.tsx).
- Site config: [`src/lib/site.ts`](../../src/lib/site.ts) — name, description, canonical URL, nav.

## How it works

### Static generation with dynamic params

The article route is a **dynamic segment** (`[slug]`), but we still want it pre-rendered. The bridge is `generateStaticParams()`:

```ts
// src/app/(public)/articles/[slug]/page.tsx
export function generateStaticParams(): Params[] {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}
```

**The concept:** at build time Next.js calls this to learn *every* slug that exists, then renders a static HTML page for each one. Visiting `/articles/hello-world` serves a pre-built file. New article → rebuild (or on-demand revalidation, which the admin triggers via `revalidatePath` in [Phase 6](06-admin-panel.md)).

Note this uses `getAllArticles()` — the **filesystem** reader — so the public site can be built *without a live database*. (Some listing pages read from the DB instead; see the trade-off below.)

### The page → data → render flow

A page is an `async` Server Component. It awaits data, then returns JSX:

```tsx
// src/app/(public)/page.tsx (homepage)
export default async function HomePage() {
  const articles = await getPublicArticles();   // DB-backed published list
  return (
    <Container>
      <section>…hero (site.name + site.description)…</section>
      <section>{articles.map((a) => <ArticleCard key={a.slug} article={a} />)}</section>
    </Container>
  );
}
```

Everything reads from [`site.ts`](../../src/lib/site.ts) for branding, so there are no hard-coded titles scattered around.

### The article page — assembling everything

[`articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx) is where prior phases come together:

1. `readArticleFile(slug)` → frontmatter + body (Phase 2). `notFound()` if missing → renders the 404 page.
2. `formatDate()` and `calculateReadingTime()` for the byline.
3. `articleJsonLd(...)` → structured data for SEO (Phase 7).
4. `extractToc(content)` → the table-of-contents items (Phase 9).
5. Renders the header, the mobile `<details>` ToC, `<Mdx source={content} />`, and the desktop ToC side-rail.

It also calls `generateMetadata()` — an async export Next.js uses to build the `<head>` (title, description, canonical URL, Open Graph). Per-page metadata is what makes individual articles share correctly on social.

### Layout, the skip link, and view transitions

[`(public)/layout.tsx`](../../src/app/(public)/layout.tsx) wraps every public page:

```tsx
<a href="#main" className="sr-only focus:not-sr-only …">Skip to content</a>
<Header />
<main id="main" className="fade-in w-full flex-1 py-12">
  <ViewTransition>{children}</ViewTransition>
</main>
<Footer />
```

- **Skip link** — visually hidden until focused; lets keyboard users jump past the nav straight to `#main` (accessibility, Phase 7).
- **`<ViewTransition>`** — React's view-transition wrapper gives a gentle cross-fade between pages.
- **`<main>` is full-width**; the *column width* is owned by `Container`, which each page (and the header/footer) wraps its content in. This is the "one container width" decision — see the [Design System](08-design-system.md) chapter.

### The `Container` component

A tiny but load-bearing piece:

```tsx
// mx-auto w-full max-w-3xl  — one definition of the reading column width
export function Container({ children, className }) { … }
```

Header, footer, and every standard page use it, so they all align. The article page is the deliberate exception: it uses a wider `xl` grid so the ToC rail can sit beside the prose ([Phase 9](09-table-of-contents.md)).

## Trade-offs & gotchas

- **Two readers, one shape.** Some pages read articles from the **filesystem** (`getAllArticles`, used by `generateStaticParams` and the RSS feed) and some from the **database** (`getPublicArticles`, used by the homepage/listings). Both return the same `ArticleListItem` shape on purpose, so components don't care which source they got. The cost is *two code paths to keep in sync*; the win is the public build never *requires* the DB, while listings can still be DB-driven once content is imported.
- **SSG means staleness until revalidation.** A freshly published article won't appear until the page is rebuilt or `revalidatePath` is called. The admin actions handle that explicitly.
- **`notFound()` renders `not-found.tsx`** — make sure a missing slug is a real 404, not a blank page.

## Explore it yourself

```bash
npm run dev
# visit:  /   /articles   /articles/hello-world   /tags   /tags/<something>
npm run build   # watch it pre-render each article route at build time
```

Open:
1. [`(public)/layout.tsx`](../../src/app/(public)/layout.tsx) — the shared shell.
2. [`(public)/articles/[slug]/page.tsx`](../../src/app/(public)/articles/[slug]/page.tsx) — the page that uses everything.
3. [`components/site/ArticleCard.tsx`](../../src/components/site/ArticleCard.tsx) — how a list row looks.
4. [`src/lib/site.ts`](../../src/lib/site.ts) — change `name`/`description` and watch it propagate.

→ Next: [Phase 4 — Search & RSS](04-search-and-rss.md)

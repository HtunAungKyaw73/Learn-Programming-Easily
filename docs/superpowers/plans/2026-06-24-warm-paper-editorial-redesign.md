# Warm-Paper Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the public site to the "Warm Paper" editorial design system with a working light/dark theme toggle.

**Architecture:** A token layer in `globals.css` (semantic CSS vars → Tailwind v4 utilities) drives every public component. Dark mode is class-based via `next-themes` (`.dark` on `<html>`), toggled from the header. Fonts: Fraunces (display), Newsreader (prose), Geist Sans (UI), Geist Mono (code). No logic changes — the existing Vitest suite must stay green throughout.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, `@tailwindcss/typography`, `next-themes`, `next/font/google`, Shiki.

## Global Constraints

- TypeScript everywhere; Tailwind utilities only (no CSS modules / styled-components). Components reference semantic tokens (`bg-paper`, `text-ink`, `text-terracotta`, `font-display`, `font-prose`), never raw hex.
- Public site only. Do NOT touch `/admin/*`, routing, data fetching, MDX/search/RSS logic. The 11-test Vitest suite must stay green.
- Dark mode is class-based (`.dark`) via `next-themes` `attribute="class"`, `defaultTheme="system"`, `enableSystem`. `<html>` gets `suppressHydrationWarning`.
- No new unit tests (asserting on CSS is theater). Each task verifies with `npm test` (stays 11/11), `npm run build` (succeeds), `npm run lint` (clean), plus a noted manual visual check.
- Node tooling runs under Node 22: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null`.
- Token values (light / dark): paper `#FBF6EC`/`#1A1613`, surface `#FFFDF8`/`#221C17`, ink `#2A2017`/`#ECE3D4`, muted `#5E5343`/`#B3A892`, faint `#8A7C66`/`#857A66`, border `#E7DCC9`/`#3A322A`, terracotta `#A23B2C`/`#D9745F`, terracotta-strong `#872F22`/`#E68B77`, gold `#C9A24B`/`#D8B45E`.
- Existing files: Tailwind v4 via `@import "tailwindcss"`; `@tailwindcss/typography` already a dep; Geist Sans/Mono already loaded in `layout.tsx` with vars `--font-geist-sans` / `--font-geist-mono`; `Header` is a Server Component calling `getSearchDocs()`.

---

### Task 1: Design-system foundation (tokens, fonts, dark strategy, provider)

**Files:**
- Modify: `package.json` (add `next-themes`)
- Create: `src/components/site/ThemeProvider.tsx`
- Rewrite: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: Tailwind utilities `bg-paper bg-surface text-ink text-muted text-faint border-border text-terracotta text-terracotta-strong text-gold font-display font-prose`; class-based `.dark`; `<ThemeProvider>` mounted at root; `.prose` warm overrides + drop-cap.

- [ ] **Step 1: Install next-themes**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm install next-themes
```

- [ ] **Step 2: Create the theme provider**

Create `src/components/site/ThemeProvider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 3: Rewrite globals.css**

Replace the entire contents of `src/app/globals.css` with:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --paper: #fbf6ec;
  --surface: #fffdf8;
  --ink: #2a2017;
  --muted: #5e5343;
  --faint: #8a7c66;
  --border: #e7dcc9;
  --terracotta: #a23b2c;
  --terracotta-strong: #872f22;
  --gold: #c9a24b;
}

.dark {
  --paper: #1a1613;
  --surface: #221c17;
  --ink: #ece3d4;
  --muted: #b3a892;
  --faint: #857a66;
  --border: #3a322a;
  --terracotta: #d9745f;
  --terracotta-strong: #e68b77;
  --gold: #d8b45e;
}

@theme inline {
  --color-paper: var(--paper);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-border: var(--border);
  --color-terracotta: var(--terracotta);
  --color-terracotta-strong: var(--terracotta-strong);
  --color-gold: var(--gold);
  --font-display: var(--font-fraunces);
  --font-prose: var(--font-newsreader);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
}

/* --- Article prose: warm palette + serif body --- */
.prose {
  --tw-prose-body: var(--muted);
  --tw-prose-headings: var(--ink);
  --tw-prose-links: var(--terracotta);
  --tw-prose-bold: var(--ink);
  --tw-prose-quotes: var(--ink);
  --tw-prose-quote-borders: var(--gold);
  --tw-prose-bullets: var(--faint);
  --tw-prose-hr: var(--border);
  --tw-prose-code: var(--ink);
  --tw-prose-captions: var(--faint);
  font-family: var(--font-prose);
  font-size: 1.15rem;
  line-height: 1.75;
}
.prose :is(h1, h2, h3, h4) {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Drop cap on the first paragraph */
.prose > p:first-of-type::first-letter {
  font-family: var(--font-display);
  font-weight: 600;
  float: left;
  font-size: 3.4em;
  line-height: 0.78;
  padding: 0.04em 0.1em 0 0;
  color: var(--terracotta);
}

/* --- Shiki: class-based dark + paper-tinted surface --- */
.prose pre.shiki {
  background-color: var(--surface) !important;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  overflow-x: auto;
}
.dark .prose pre.shiki,
.dark .prose pre.shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
.prose :where(code):not(:where(pre *))::before,
.prose :where(code):not(:where(pre *))::after {
  content: none;
}

/* Highlighted / diff lines from Shiki transformer notations */
.shiki .highlighted {
  background-color: rgb(101 117 133 / 0.16);
  display: inline-block;
  width: 100%;
  margin: 0 -1.25rem;
  padding: 0 1.25rem;
}
.shiki .diff {
  display: inline-block;
  width: 100%;
  margin: 0 -1.25rem;
  padding: 0 1.25rem;
}
.shiki .diff.add {
  background-color: rgb(16 185 129 / 0.16);
}
.shiki .diff.remove {
  background-color: rgb(244 63 94 / 0.16);
}
```

- [ ] **Step 4: Update layout.tsx (fonts, provider, dark-safe html)**

In `src/app/layout.tsx`, replace the font imports/decls and the `<html>`/`<body>` markup. Keep the existing `metadata` export unchanged.

Imports + font declarations:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Newsreader } from "next/font/google";
import { site } from "@/lib/site";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});
```

Markup (replace the existing `return (...)`):

```tsx
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
```

- [ ] **Step 5: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: tests 11/11; build succeeds; lint clean. (No visible change yet beyond the paper background — components restyle in later tasks. Confirm `<html class="… dark">` is set when your OS is in dark mode by loading the site.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/site/ThemeProvider.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat(design): warm-paper tokens, editorial fonts, class-based theme provider"
```

---

### Task 2: Theme toggle + header

**Files:**
- Create: `src/components/site/ThemeToggleButton.tsx`
- Create: `src/components/site/ThemeToggle.tsx`
- Modify: `src/components/site/Header.tsx`

**Interfaces:**
- Consumes: `useTheme` from `next-themes`; the design tokens from Task 1.
- Produces: `<ThemeToggle />` (client) mounted in `Header`.

- [ ] **Step 1: The toggle button (client, uses useTheme)**

Create `src/components/site/ThemeToggleButton.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";

export default function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: SSR-safe wrapper (avoids hydration mismatch AND the set-state-in-effect lint)**

Create `src/components/site/ThemeToggle.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

const ThemeToggleButton = dynamic(() => import("./ThemeToggleButton"), {
  ssr: false,
  loading: () => <span className="inline-block h-8 w-8" aria-hidden />,
});

export function ThemeToggle() {
  return <ThemeToggleButton />;
}
```

Note: `ssr: false` is allowed here because this is a Client Component. The server renders the fixed-size placeholder; the button mounts on the client once `resolvedTheme` is known, so there is no theme flash and no `useEffect` mounted-flag (which would trip `react-hooks/set-state-in-effect`).

- [ ] **Step 3: Restyle Header + mount the toggle**

Replace the contents of `src/components/site/Header.tsx` with:

```tsx
import Link from "next/link";
import { site } from "@/lib/site";
import { Search } from "@/components/search/Search";
import { getSearchDocs } from "@/lib/search-index";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export function Header() {
  const docs = getSearchDocs();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          {site.name}
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <Search docs={docs} />
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-terracotta"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 11/11, build ok, lint clean. Manual: header shows the Fraunces wordmark on paper; the sun/moon toggle flips the whole page light↔dark and the choice survives a reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/ThemeToggleButton.tsx src/components/site/ThemeToggle.tsx src/components/site/Header.tsx
git commit -m "feat(design): header restyle + light/dark theme toggle"
```

---

### Task 3: Article card + home page

**Files:**
- Modify: `src/components/site/ArticleCard.tsx`
- Modify: `src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: design tokens; `ArticleListItem` (`{ slug, frontmatter, readingTime }`), `formatDate`.

- [ ] **Step 1: Restyle ArticleCard (kicker → Fraunces title → Newsreader dek)**

Replace the contents of `src/components/site/ArticleCard.tsx` with:

```tsx
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { ArticleListItem } from "@/types";

export function ArticleCard({ article }: { article: ArticleListItem }) {
  const { slug, frontmatter, readingTime } = article;
  const date = formatDate(frontmatter.publishedAt);
  const kicker = frontmatter.categories?.[0] ?? frontmatter.tags?.[0];

  return (
    <article className="group border-b border-border py-8 last:border-0">
      <Link href={`/articles/${slug}`} className="block">
        {kicker && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-terracotta">
          {frontmatter.title}
        </h2>
        {frontmatter.description && (
          <p className="mt-2 font-prose text-lg leading-relaxed text-muted">
            {frontmatter.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-faint">
          {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{readingTime} min read</span>
          {frontmatter.featured && (
            <span className="rounded-full bg-terracotta/10 px-2 py-0.5 font-medium text-terracotta">
              Featured
            </span>
          )}
        </div>
      </Link>
      {frontmatter.tags && frontmatter.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {frontmatter.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="text-xs text-faint transition-colors hover:text-terracotta"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Restyle the home hero**

Replace the contents of `src/app/(public)/page.tsx` with:

```tsx
import { getAllArticles } from "@/lib/mdx";
import { ArticleCard } from "@/components/site/ArticleCard";
import { site } from "@/lib/site";

export default function HomePage() {
  const articles = getAllArticles();

  return (
    <div>
      <section className="border-b border-border pb-12">
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          {site.name}
        </h1>
        <p className="mt-5 max-w-xl font-prose text-xl leading-relaxed text-muted">
          {site.description}
        </p>
      </section>

      <section className="mt-4">
        {articles.length === 0 ? (
          <p className="py-16 text-center text-faint">
            No articles yet. Check back soon.
          </p>
        ) : (
          articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 11/11, build ok, lint clean. Manual: home shows Fraunces hero + editorial cards (terracotta kicker, serif dek) in both themes.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/ArticleCard.tsx "src/app/(public)/page.tsx"
git commit -m "feat(design): editorial article cards and home hero"
```

---

### Task 4: Article page + MDX prose

**Files:**
- Modify: `src/components/mdx/Mdx.tsx`
- Modify: `src/app/(public)/articles/[slug]/page.tsx`

**Interfaces:**
- Consumes: the `.prose` warm overrides + drop-cap defined in Task 1; design tokens.

- [ ] **Step 1: Point the MDX wrapper at the warm prose**

In `src/components/mdx/Mdx.tsx`, change the wrapper `div` className from `"prose prose-zinc dark:prose-invert max-w-none"` to `"prose max-w-none"` (the warm palette + Newsreader + drop-cap now come from `globals.css`). Leave the `MDXRemote` config untouched.

```tsx
    <div className="prose max-w-none">
      <MDXRemote
        source={source}
```

- [ ] **Step 2: Restyle the article header**

In `src/app/(public)/articles/[slug]/page.tsx`, replace the returned JSX (from `return (` to the closing `);`) with:

```tsx
  return (
    <article>
      <Link
        href="/"
        className="text-sm text-muted transition-colors hover:text-terracotta"
      >
        ← Back
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <div className="mb-3 flex items-center gap-3 text-sm text-faint">
          {date && <time dateTime={frontmatter.publishedAt}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{readingTime} min read</span>
        </div>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {frontmatter.title}
        </h1>
        {frontmatter.description && (
          <p className="mt-3 font-prose text-xl leading-relaxed text-muted">
            {frontmatter.description}
          </p>
        )}
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {frontmatter.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="text-sm text-faint transition-colors hover:text-terracotta"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="mt-8">
        <Mdx source={content} />
      </div>
    </article>
  );
```

- [ ] **Step 3: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 11/11, build ok, lint clean. Manual: open `/articles/hello-world` — Fraunces title, Newsreader body, terracotta drop-cap on the first paragraph, paper-tinted code block; toggle dark and confirm the code block + prose flip correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/mdx/Mdx.tsx "src/app/(public)/articles/[slug]/page.tsx"
git commit -m "feat(design): editorial article page, serif prose, drop-cap"
```

---

### Task 5: Footer, index/tag pages, search modal

**Files:**
- Modify: `src/components/site/Footer.tsx`
- Modify: `src/app/(public)/articles/page.tsx`
- Modify: `src/app/(public)/tags/page.tsx`
- Modify: `src/app/(public)/tags/[tag]/page.tsx`
- Modify: `src/components/search/Search.tsx`

**Interfaces:**
- Consumes: design tokens. No behavior changes (search logic, generateStaticParams, metadata stay identical).

- [ ] **Step 1: Footer**

Replace the contents of `src/components/site/Footer.tsx` with:

```tsx
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-10 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.author}
        </p>
        <div className="flex items-center gap-4">
          <a href="/rss.xml" className="transition-colors hover:text-terracotta">
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Articles index**

In `src/app/(public)/articles/page.tsx`, replace the heading + count block so the heading uses `font-display` and tokens:

```tsx
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Articles
      </h1>
      <p className="mt-2 text-muted">
        {articles.length} article{articles.length === 1 ? "" : "s"}, newest
        first.
      </p>
```

And change the empty-state line `<p className="py-16 text-center text-zinc-500 dark:text-zinc-400">` to `<p className="py-16 text-center text-faint">`.

- [ ] **Step 3: Tags index**

In `src/app/(public)/tags/page.tsx`:
- Heading → `<h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Tags</h1>`
- Intro `<p>` → `className="mt-2 text-muted"`
- Empty-state `<p>` → `className="text-faint"`
- Each tag `Link` className → `"rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"`
- The count `<span>` inside → `className="ml-2 text-faint"`

- [ ] **Step 4: Tag detail**

In `src/app/(public)/tags/[tag]/page.tsx`:
- Heading → `<h1 className="font-display text-3xl font-semibold tracking-tight text-ink">#{decoded}</h1>`
- Count `<p>` → `className="mt-2 text-muted"`

- [ ] **Step 5: Search modal**

In `src/components/search/Search.tsx`, restyle these className strings (logic untouched):
- Trigger button → `"flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"`
- The `kbd` → `"hidden rounded bg-surface px-1.5 font-mono text-xs text-faint sm:inline"`
- Overlay `div` → keep `"fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"`
- Panel `div` → `"w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"`
- Input → `"w-full border-b border-border bg-transparent px-4 py-3.5 text-ink outline-none placeholder:text-faint"`
- "No matches" `li` → `"px-4 py-6 text-center text-sm text-faint"`
- Result `button` → `"block w-full px-4 py-3 text-left transition-colors hover:bg-paper"`
- Result title `span` → `"block font-medium text-ink"`
- Result description `span` → `"mt-0.5 block truncate text-sm text-muted"`

- [ ] **Step 6: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 11/11, build ok, lint clean. Manual: footer, `/articles`, `/tags`, a `/tags/<tag>` page, and the ⌘K modal all render on the warm palette and flip correctly in dark mode; grep confirms no `zinc` classes remain in public components: `grep -rn "zinc" src/app/\(public\) src/components/site src/components/search src/components/mdx` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/Footer.tsx "src/app/(public)/articles/page.tsx" "src/app/(public)/tags/page.tsx" "src/app/(public)/tags/[tag]/page.tsx" src/components/search/Search.tsx
git commit -m "feat(design): restyle footer, index/tag pages, and search modal"
```

---

## Self-Review

**Spec coverage:**
- Warm-Paper tokens (light+dark) + Tailwind utilities → Task 1. ✓
- Four font roles (Fraunces/Newsreader/Geist Sans/Geist Mono) → Task 1. ✓
- Class-based dark + `next-themes` provider, `suppressHydrationWarning`, `@custom-variant dark` → Task 1. ✓
- Theme toggle (system default, persisted, no flash, SSR-safe) → Task 2. ✓
- Header / ArticleCard / Home / Article+prose+drop-cap / index+tags / Footer / Search restyles → Tasks 2–5. ✓
- Drop-cap on first article paragraph → Task 1 (CSS) consumed by Task 4. ✓
- Shiki code blocks: class-based dark + paper tint → Task 1. ✓
- Admin untouched; no logic changes; suite stays green → enforced in every task's verify step. ✓

**Placeholder scan:** No TBD/TODO; full code or exact className strings for every change. ✓

**Type consistency:** Token utility names (`paper/surface/ink/muted/faint/border/terracotta/terracotta-strong/gold`, `font-display/font-prose`) are defined in Task 1's `@theme` and used identically in Tasks 2–5. `kicker` derives from `frontmatter.categories?.[0] ?? frontmatter.tags?.[0]` (both exist on `ArticleFrontmatter`). `ThemeToggle` (wrapper) is what `Header` imports; `ThemeToggleButton` is the dynamic target. ✓

## Notes / Risks

- `bg-paper/85` (Header) uses Tailwind v4's opacity modifier on a custom token — v4 resolves it via `color-mix`, which works for the `--color-*` hex tokens defined in `@theme`.
- `next-themes` `ssr:false` dynamic import is the deliberate choice over a `useEffect` mounted flag, which would trip `react-hooks/set-state-in-effect` (an error in this project's lint config).
- Shiki emits inline light colors; the `.prose pre.shiki { background: var(--surface) !important }` override tints the block to warm off-white in light mode, and the `.dark` block restores Shiki's dark palette.
- Visual correctness is the real acceptance bar; the build/lint/test gates only catch regressions. The final review should include a manual light+dark pass across all public routes.
```

# Phase 2 — MDX Pipeline

> Turn `.mdx` files on disk into rendered article HTML, with frontmatter, syntax-highlighted code, and smart links.

## The problem

Articles need to be:

- **Authored comfortably** — in plain files, in your editor, with version control and diffs.
- **Rich** — real headings, lists, links, and *especially* beautiful code blocks (this is a programming blog).
- **Structured** — each article carries metadata (title, tags, publish date) that pages and feeds need.

A database `TEXT` column could hold the body, but then your content isn't diffable, isn't editable in your IDE, and every typo fix is a DB write. Plain Markdown can't embed components. We need something in between.

## The rationale: the hybrid content model

This is the architectural heart of the whole project.

> **Body lives in files. Metadata lives in the database.**

- The **body** is an [`.mdx`](../../content/hello-world.mdx) file in [`/content`](../../content). MDX = Markdown + JSX, so you get Markdown's ease *plus* the ability to drop in React components later.
- The **metadata** is **frontmatter** — a YAML block fenced by `---` at the top of the file — which is *also* mirrored into Postgres (that sync is [Phase 6](06-admin-panel.md)).

Why split them?

| Need | Met by |
|---|---|
| IDE editing, diffs, version control | Files |
| Fast relational queries, filtering, counts | Database |
| Single source of truth for *prose* | The file (frontmatter included) |

The frontmatter in the file is the **source of truth**; the database is a queryable **mirror** of it.

## What was built

- **The MDX reader/library** — [`src/lib/mdx.ts`](../../src/lib/mdx.ts): read, write, list, and derive articles from disk.
- **The renderer component** — [`src/components/mdx/Mdx.tsx`](../../src/components/mdx/Mdx.tsx): MDX → React with Shiki highlighting.
- **Element overrides** — [`src/components/mdx/mdx-components.tsx`](../../src/components/mdx/mdx-components.tsx): custom link behavior.
- **Reading-time + visibility helpers** in the same library.

## How it works

### 1. Reading & parsing a file

[`readArticleFile(slug)`](../../src/lib/mdx.ts) reads `content/<slug>.mdx` and runs it through **`gray-matter`**, which splits the file into:

- `data` — the parsed frontmatter object (becomes `ArticleFrontmatter`).
- `content` — the Markdown/MDX body string.

```ts
const raw = fs.readFileSync(filePath, "utf-8");
const { data, content } = matter(raw);
return { frontmatter: data as ArticleFrontmatter, content, readingTime: calculateReadingTime(content) };
```

Listing functions build on this: `listArticleSlugs()` scans the directory, `getAllArticles()` maps every slug through the reader, filters by visibility, and sorts newest-first.

### 2. The draft/visibility rule

```ts
function isVisible(frontmatter: ArticleFrontmatter): boolean {
  if (process.env.NODE_ENV !== "production") return true;   // dev: show drafts
  return frontmatter.published === true;                     // prod: published only
}
```

**The concept:** in development you want to *see your drafts* so you can preview them. In production, only `published: true` articles should appear. One function encodes that policy, and every listing path goes through it — so the rule can't drift between pages.

### 3. Rendering MDX → HTML, with highlighted code

[`Mdx.tsx`](../../src/components/mdx/Mdx.tsx) uses `next-mdx-remote/rsc` to render the body **on the server** (it's a React Server Component — no client JS shipped for the prose). The interesting part is the rehype plugin chain:

```tsx
<MDXRemote
  source={source}
  components={mdxComponents}
  options={{ mdxOptions: { rehypePlugins: [
    rehypeSlug,                               // 1. give every heading an id
    [rehypeShiki, {                           // 2. syntax-highlight code blocks
      themes: { light: "github-light", dark: "github-dark" },
      transformers: [transformerNotationDiff(), transformerNotationHighlight()],
    }],
  ]}}}
/>
```

Concepts worth understanding:

- **`rehype-slug`** walks the rendered headings and adds `id="..."` attributes (e.g. `## What is MDX` → `id="what-is-mdx"`). Those ids are what in-page anchor links and the [Table of Contents](09-table-of-contents.md) point at. *This is why the ToC parser must generate ids the exact same way.*
- **Shiki** highlights code at **render/build time**, not in the browser. The reader downloads pre-colored HTML — no client-side highlighting library, no flash of unstyled code.
- **Dual theme.** Shiki emits *both* a light (`github-light`) and dark (`github-dark`) palette as CSS variables. The actual color shown is chosen by CSS in `globals.css` based on the active theme — so switching light/dark recolors code instantly with no re-render.
- **Notation transformers.** Special comments in code (e.g. `// [!code highlight]`, `// [!code ++]`) get turned into highlighted or diff lines, styled by rules in `globals.css`.

### 4. Smart links

[`mdx-components.tsx`](../../src/components/mdx/mdx-components.tsx) overrides the `<a>` element:

```tsx
const isInternal = href.startsWith("/") || href.startsWith("#");
// internal → Next.js <Link> (client-side nav, no full reload)
// external → <a target="_blank" rel="noopener noreferrer"> (new tab, safely)
```

**The concept:** internal links should use Next's `<Link>` for fast client-side navigation; external links should open in a new tab and carry `rel="noopener noreferrer"` to avoid the [reverse-tabnabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing) security issue. One override applies this policy to *every* link in *every* article automatically.

### 5. Writing files (used later by the admin)

The reader is also a *writer*: `writeArticleFile()` serializes frontmatter + body back to disk with `matter.stringify()`. There's a real bug-fix baked in here worth noting:

```ts
// js-yaml's dump() throws on `undefined` values; optional fields (e.g. empty
// coverImage) arrive as undefined, so strip undefined keys before serializing.
const cleaned = Object.fromEntries(
  Object.entries(frontmatter).filter(([, value]) => value !== undefined),
);
```

Without this, saving an article that left an optional field blank would crash with *"unacceptable kind of an object to dump."* The admin's save flow ([Phase 6](06-admin-panel.md)) depends on this writer.

### 6. Reading time

`calculateReadingTime()` is deliberately simple: word count ÷ 200 wpm, rounded up, floor of 1 minute. Good enough, no dependency.

## Trade-offs & gotchas

- **`src/lib/mdx.ts` imports `fs`** — it can only run on the server. Importing it (even transitively) from a Client Component breaks the build. This boundary becomes a real design constraint in [Phase 4](04-search-and-rss.md), where the search code is split specifically to avoid pulling `fs` into the browser bundle.
- **Frontmatter is untyped at the file boundary.** `gray-matter` returns `data` as `any`; we cast it to `ArticleFrontmatter`. A malformed frontmatter block won't be caught by the compiler — only by what breaks downstream.
- **Server-only rendering of MDX** means article bodies ship zero client JS for the prose — great for performance, but interactive MDX components would need explicit `"use client"` islands.

## Explore it yourself

```bash
# See an article's raw form: frontmatter on top, MDX body below.
cat content/hello-world.mdx
```

Open:
1. [`content/hello-world.mdx`](../../content/hello-world.mdx) — what an article actually looks like on disk.
2. [`src/lib/mdx.ts`](../../src/lib/mdx.ts) — read/write/list/visibility.
3. [`src/components/mdx/Mdx.tsx`](../../src/components/mdx/Mdx.tsx) — the rehype chain.
4. Run `npm run dev`, visit an article, and **View Source** — note the code is already colored in the HTML.

→ Next: [Phase 3 — Public Site](03-public-site.md)

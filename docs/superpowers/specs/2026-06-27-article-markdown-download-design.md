# Article Markdown Download — Design

**Date:** 2026-06-27
**Status:** Approved

## Goal

Let the admin download any article as a `.md` file from the admin panel. The
file contains YAML frontmatter rebuilt from the article's DB metadata plus the
raw MDX body, so it is round-trippable (re-importable via `gray-matter`).

## Background

- Article body (raw MDX) lives in `Article.body`; metadata lives in DB columns
  and relations (tags, categories). There is no `/content` directory.
- `gray-matter` is already a dependency and is used for the admin live preview.
  Its `matter.stringify(body, data)` produces `frontmatter + body`.
- The `ArticleFrontmatter` type (`src/types/index.ts`) maps 1:1 to the metadata
  we serialize.
- `/admin/:path*` is already auth-gated by middleware (`src/proxy.ts`).

## Components

### 1. Serializer — `src/lib/articleMarkdown.ts` (new)

```ts
export function toMarkdownFile(article: ArticleWithContent): string
```

- Builds an `ArticleFrontmatter` object from the article:
  - `title` (always present)
  - `description` — omitted when null/empty
  - `tags` / `categories` — arrays of `name`, omitted when empty
  - `published`, `featured` — booleans
  - `publishedAt` — ISO date string (`YYYY-MM-DD`), omitted when null
  - `coverImage` — omitted when null/empty
- Returns `matter.stringify(article.content, frontmatter)`.
- Pure function → unit-tested with Vitest.

### 2. Route handler — `src/app/admin/(protected)/articles/[slug]/download/route.ts` (new)

```ts
export async function GET(_req, { params }): Promise<Response>
```

- `await requireAuth()` (defensive; middleware already gates `/admin/*`).
- `getAdminArticleBySlug(slug)`; return `404` if not found.
- Return `Response` with the serialized markdown and headers:
  - `Content-Type: text/markdown; charset=utf-8`
  - `Content-Disposition: attachment; filename="<slug>.md"`

### 3. List-row button — `src/app/admin/(protected)/articles/page.tsx`

Download icon `<a href={`/admin/articles/${slug}/download`} download>` in the
Actions column, styled like the existing View/Edit/Delete icons.

### 4. Edit-page button — `src/app/admin/(protected)/articles/[slug]/edit/page.tsx`

A download link/button in the edit page header for the open article.

## Data Flow

Browser `GET /admin/articles/<slug>/download` → route handler → `requireAuth` →
`getAdminArticleBySlug` → `toMarkdownFile` → `Response` (attachment) → browser
native file save.

## Error Handling

- Article not found → `404`.
- Unauthenticated → middleware redirect to `/admin/login`.

## Testing

- Vitest unit test for `toMarkdownFile`: frontmatter fields present, null/empty
  omitted, `publishedAt` formatted, body preserved, round-trips through
  `matter()`.

## Out of Scope

- Bulk / zip export of all articles.

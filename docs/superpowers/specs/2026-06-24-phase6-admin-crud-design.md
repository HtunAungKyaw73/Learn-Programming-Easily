# Phase 6 — Admin Article Management (CRUD) Design

## Goal

Wire up the hybrid content model (MDX files + DB metadata) and build a full admin UI for creating, editing, publishing, and deleting articles, plus dedicated tag/category management.

## Architecture

**Hybrid data flow:**

```
Admin Form → Server Action → write MDX file (/content/*.mdx)
                            → upsert metadata (Prisma Article + Tag + Category)

Public Pages → Prisma queries (listings, filtering, tags)
Article Detail → read MDX body from disk (rendered by Mdx component)
```

MDX files are the source of truth for content. Prisma is the source of truth for metadata (title, slug, published, featured, tags, categories, dates). Every admin save writes both, keeping them in lockstep.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma 7, Auth.js v5, `next-mdx-remote`, Shiki, Vitest.

## Global Constraints

- TypeScript everywhere; Tailwind for styling; Server Components by default (`"use client"` only when needed).
- Server Actions for all mutations (no REST API routes).
- Auth-gated: every server action calls `auth()` first, redirects if not signed in.
- MDX frontmatter stays in sync with DB metadata on every save.
- Public pages switch from filesystem reads to Prisma queries (DB-first for listings).
- Article detail page still reads MDX body from disk for rendering.
- No file uploads — cover image is a URL text field.
- No new npm dependencies unless explicitly noted.
- Existing `ArticleCard`, `Mdx`, and public layout components are unchanged (data source swaps, not component rewrites).

---

## Types

Add to `src/types/index.ts`:

```ts
export interface AdminArticleListItem {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  readingTime: number | null;
  tags: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}

export interface AdminTagItem {
  id: number;
  name: string;
  slug: string;
  _count: { articles: number };
}
```

Existing types used as-is: `ArticleListItem` (public cards), `ArticleWithContent` (edit form), `ArticleFrontmatter` (MDX serialization).

---

## Modules

### Prisma Queries

**`src/lib/queries/articles.ts`:**

| Function | Returns | Used by |
|---|---|---|
| `getAdminArticles({ filter? })` | `AdminArticleListItem[]` | Admin article list (all articles, optional published/draft filter) |
| `getAdminArticleBySlug(slug)` | `ArticleWithContent \| null` | Edit page (loads MDX body from disk, metadata from DB) |
| `getArticleStats()` | `{ total, published, drafts }` | Dashboard stats cards |
| `getPublicArticles()` | `ArticleListItem[]` | Homepage, articles index (published only, transforms DB → ArticleListItem shape) |
| `getPublicArticlesByTag(tag)` | `ArticleListItem[]` | Tag detail page |
| `getPublicTagsWithCount()` | `{ name: string; slug: string; count: number }[]` | Public tag index |

**`src/lib/queries/tags.ts`:**

| Function | Returns |
|---|---|
| `getAdminTags()` | `AdminTagItem[]` |
| `createTag(name)` | Tag record with auto-slug |
| `updateTag(id, name)` | Updated tag |
| `deleteTag(id)` | Deleted tag (Prisma cascade disconnects) |

**`src/lib/queries/categories.ts`:** Same pattern as tags.

### MDX Write Helpers

Add to `src/lib/mdx.ts`:

| Function | What it does |
|---|---|
| `writeArticleFile(slug, frontmatter, content)` | Serializes YAML frontmatter + MDX body to `/content/{slug}.mdx` |
| `deleteArticleFile(slug)` | Removes the `.mdx` file |

### Server Actions

**`src/lib/actions/article.ts`:**

| Action | Input | Behavior |
|---|---|---|
| `createArticle(formData)` | title, slug, description, content, published, featured, publishedAt, coverImage, tagNames[], categoryNames[] | Validate slug unique + format → write MDX file → create Article with tag/category connects → revalidate |
| `updateArticle(slug, formData)` | same | Rewrite MDX file → update Article → diff tags/categories (connect new, disconnect removed) → revalidate |
| `deleteArticle(slug)` | slug | Delete MDX file → delete Article → revalidate |
| `togglePublished(slug)` | slug | Flip published → sync frontmatter → revalidate |
| `toggleFeatured(slug)` | slug | Flip featured → sync frontmatter → revalidate |

**`src/lib/actions/tag.ts`:**

| Action | Input | Behavior |
|---|---|---|
| `createTag(name)` | name string | Validate unique → create with auto-slug → revalidate |
| `updateTag(id, name)` | id, name | Update name + slug → revalidate |
| `deleteTag(id)` | id | Delete tag → revalidate |

**`src/lib/actions/category.ts`:** Same pattern as tags.

**`src/lib/actions/preview.ts`:**

| Action | Input | Returns |
|---|---|---|
| `renderMdxPreview(content)` | raw MDX string (may include frontmatter) | Parse with `gray-matter` → render body only → return HTML string (Shiki dual-theme, slug anchors). Frontmatter is shown in form fields, not in preview. |

**Return shape:** All actions return `{ ok: true }` or `{ ok: false, error: string }`. Auth failures redirect (standard Next.js).

**Tag/Category sync in updateArticle:**
1. Get current tag names from DB
2. Compute `toConnect` (new names not in current) and `toDisconnect` (current names not in new)
3. For `toConnect`: upsert tag by name (find or create), then connect
4. For `toDisconnect`: find tag by name, then disconnect

---

## Admin UI

### Layout (`src/app/admin/layout.tsx`)

Top nav bar with Warm-Paper design tokens:

```
┌─────────────────────────────────────────────────────────┐
│ LPE · Dashboard  Articles  New Article  Tags  Categories│
│                                        admin@ex.com Sign out│
├─────────────────────────────────────────────────────────┤
│                    {page content}                        │
└─────────────────────────────────────────────────────────┘
```

- Active nav link: terracotta underline
- Responsive: hamburger on mobile
- Uses `site.shortName` ("LPE") for branding

### Dashboard (`src/app/admin/page.tsx`)

- Stat cards: total articles, published count, draft count
- Recent articles list (last 5) with quick edit link + publish badge
- "New Article" CTA button

### Article List (`src/app/admin/articles/page.tsx`)

- Filter tabs: All / Published / Drafts
- Table rows: status dot (● published / ○ draft), title (links to edit), tags (pills), date, edit/delete actions
- Delete: `window.confirm()` then calls `deleteArticle` server action
- "New Article" button

### Article Editor

**Pages:** `src/app/admin/articles/new/page.tsx` (create) + `src/app/admin/articles/[slug]/edit/page.tsx` (edit). Both render `<ArticleForm>`.

**`src/components/admin/ArticleForm.tsx`** (client component):

Split-pane layout:
- **Left pane (form):** Title, Slug (auto-generated on create, read-only on edit), Description, Cover Image URL, Tags (TagInput), Categories (TagInput), Published checkbox, Featured checkbox, Published At date, Content textarea
- **Right pane (preview):** Toggled by Edit/Preview button. Calls `renderMdxPreview` server action, debounced 500ms. Renders HTML in a styled container matching the public article prose style.

**`src/components/admin/TagInput.tsx`** (client component):
- Type + Enter to add a tag chip
- × button on each chip to remove
- Controlled component: `value: string[]`, `onChange: (tags: string[]) => void`

**`src/components/admin/DeleteButton.tsx`** (client component):
- Wraps a button with `window.confirm()` before calling a server action
- Props: `action: () => Promise<void>`, `label: string`

### Tag Management (`src/app/admin/tags/page.tsx`)

- List: tag name, article count, edit/delete buttons
- Inline create: input field appears on [+ New Tag] click
- Inline edit: click edit → input replaces name, Enter to save, Esc to cancel
- Delete: confirm dialog

### Category Management (`src/app/admin/categories/page.tsx`)

Identical pattern to tags.

---

## Public Page Migration

Minimal changes — swap the data source, keep the component code:

| Page | Change |
|---|---|
| Homepage `/` | Import `getPublicArticles()` instead of `getAllArticles()` |
| Articles `/articles` | Same swap |
| Tags `/tags` | Import `getPublicTagsWithCount()` instead of `getAllTags()` + `getArticlesByTag()` |
| Tag detail `/tags/[tag]` | Import `getPublicArticlesByTag(tag)` instead of `getArticlesByTag(tag)` |
| Article detail `/articles/[slug]` | **No change** — reads MDX from disk |
| Search index | Import `getPublicArticles()` instead of `getAllArticles()` |
| RSS feed | **No change** — can migrate later |

`ArticleCard` component: **no changes** — `getPublicArticles()` returns the existing `ArticleListItem` shape.

---

## Error Handling

- Server actions: return `{ ok: false, error: "message" }` for validation errors. Display in the form.
- Auth failures: standard Next.js redirect to `/admin/login`.
- Slug validation: must be non-empty, URL-safe (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), unique (check DB + filesystem).
- File operations: wrap in try/catch, return error message to form.
- Delete confirmation: `window.confirm()` for simplicity (YAGNI — custom modal deferred).

---

## Testing

| Layer | Approach |
|---|---|
| Prisma queries | Mock `prisma` with `vi.mock()`, test return shapes |
| MDX write helpers | Mock `fs`, test YAML serialization + file deletion |
| Server actions | Build verification + manual testing |
| Admin UI | Build verification + manual testing |
| Public pages | Existing tests pass (same types) + build verification |

**Manual verification flow:**
1. Log in at `/admin/login`
2. Dashboard shows stats (0 articles)
3. Create article with tags → appears on homepage
4. Edit it → changes reflected on public site
5. Unpublish → disappears from public, visible in admin
6. Delete → gone from both
7. Tag management: create → use in article → delete
8. Category management: same flow

# Phase 7 (Slice 1) — App States, Bug Tidy & View Transitions — Design

**Date:** 2026-06-24
**Status:** Approved
**Scope:** First slice of the Phase 7 polish pass. Add missing app-state pages (404, error boundaries, admin loading), enable cross-page View Transitions, tidy the MDX-preview code, and polish empty states. No data/logic changes.

## Goal

Make the app feel finished when things go wrong or are loading: a branded 404, graceful error recovery, admin loading skeletons, smooth route transitions, and clean empty states — all on the Warm-Paper design system.

## Decisions (locked)

- **View Transitions:** Next 16 experimental (`experimental.viewTransition: true`) + React's `<ViewTransition>`. Applied to **public routes only** for now (admin skipped). Default crossfade, no per-link `transitionTypes`.
- **404:** a single root `src/app/not-found.tsx` carrying its own minimal chrome (no header/footer), warm-paper styled.
- **Errors:** shared `ErrorState` component reused by a public and an admin `error.tsx`, plus a root `global-error.tsx`.
- **Loading:** admin only (`src/app/admin/loading.tsx`); public listings are static.
- **Bug tidy:** `ArticleForm` preview is functionally correct — rename misleading vars and drop a redundant wrapper only.

## Components

### View Transitions
- `next.config.ts`: add `experimental: { viewTransition: true }`.
- `src/app/(public)/layout.tsx`: import `{ ViewTransition } from "react"` and wrap the `<main>` children in `<ViewTransition>` so client navigations between public routes crossfade.
- `src/app/globals.css`: a `@keyframes fade-in-up` + a `.fade-in` utility (opacity + small translateY) for first-paint content easing; respect `prefers-reduced-motion` (no transform/anim when set).

### Custom 404 — `src/app/not-found.tsx`
- Server component, renders inside the root layout (which has no header/footer), so it includes its own minimal chrome: the site wordmark (Fraunces), an "Page not found" headline, a short line, and a terracotta link back to `/`.
- Centered, `bg-paper text-ink`, works in light/dark.

### Error boundaries
- `src/components/site/ErrorState.tsx` (`"use client"`): props `{ title?: string; reset?: () => void }`. Renders a friendly message and, when `reset` is provided, a "Try again" button. Warm-paper styled. Does not log — the boundary does.
- `src/app/(public)/error.tsx` (`"use client"`): `({ error, reset })`; logs via `useEffect(() => { console.error(error); }, [error])` (idiomatic Next error boundary, lint-clean — no setState in effect) and renders `<ErrorState title="Something went wrong." reset={reset} />`.
- `src/app/admin/error.tsx` (`"use client"`): same pattern, title "Admin error."
- `src/app/global-error.tsx` (`"use client"`): must render its own `<html><body>` (root layout is bypassed). Minimal inline-styled fallback + reset (cannot rely on Tailwind tokens since globals may not apply — use plain inline styles with the paper/ink hex values).

### Loading — `src/app/admin/loading.tsx`
- Server component skeleton: a few pulsing placeholder bars (`animate-pulse`, `bg-border` blocks) approximating the admin list/dashboard, on `bg-paper`.

### Bug tidy + empty states
- `src/components/admin/ArticleForm.tsx`: rename `previewHtml` → `previewBody` (and setter); remove the redundant outer `<div className="prose">` around `<Mdx>` (Mdx already wraps in `.prose`). No behavior change.
- Empty states (`src/app/(public)/page.tsx`, `src/app/(public)/articles/page.tsx`): replace the bare "No articles yet" `<p>` with a small centered block (muted icon-free heading + subline) for a more finished look. Keep copy.

## Error / edge handling

- `not-found.tsx` triggers for any `notFound()` (bad article/tag slug) and unmatched URLs.
- Error boundaries catch render/data exceptions; `reset()` retries the segment.
- `global-error.tsx` is the last resort for root-layout failures and must be self-contained (own `<html>`).
- View Transitions degrade gracefully: browsers without the API simply navigate without animation; `prefers-reduced-motion` disables the CSS fade.

## Testing

- **Unit (Vitest):** `renderMdxPreview` — strips frontmatter and returns the body (`src/lib/actions/preview.test.ts`): given content with frontmatter → body only; given plain content → unchanged; malformed input → `{ ok: false }` is acceptable but assert it returns body for well-formed input. (Server action calls `requireAuth()`; the test mocks `./auth-guard` so it no-ops.)
- **Gates:** `npm test` (12 tests now), `npm run build` (succeeds; `not-found`/`error`/`loading` segments compile; viewTransition flag accepted), `npm run lint` (clean).
- **Manual (user):** trigger a 404 (`/articles/does-not-exist`), see the branded page; navigate between public routes and observe the crossfade; load an admin route and see the skeleton; confirm light/dark both fine.

## Out of scope (later Phase 7 slices)

- SEO finishing (sitemap/robots/JSON-LD) — slice 3.
- Accessibility & responsive QA — slice 4.
- Hardening & deferred auth items — slice 2.
- Per-link/typed transitions, richer skeletons, admin View Transitions.

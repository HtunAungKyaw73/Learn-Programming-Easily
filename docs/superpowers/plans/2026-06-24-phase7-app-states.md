# Phase 7 Slice 1 — App States, Bug Tidy & View Transitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add branded 404 / error / loading states, enable cross-page View Transitions, tidy the MDX preview, and polish empty states.

**Architecture:** Next 16 special files (`not-found`, `error`, `global-error`, `loading`) plus React's experimental `<ViewTransition>` (enabled via `experimental.viewTransition`). A shared `ErrorState` component is reused by the error boundaries. All styling uses the existing Warm-Paper tokens. No data/logic changes.

**Tech Stack:** Next.js 16 App Router (experimental viewTransition), React 19.2 `ViewTransition`, Tailwind v4 (warm-paper tokens), Vitest, gray-matter.

## Global Constraints

- TypeScript everywhere; Tailwind utilities with the warm-paper tokens (`bg-paper text-ink text-muted text-faint text-terracotta border-border font-display font-prose`). No raw hex except `global-error.tsx` (which can't rely on the stylesheet).
- View Transitions on **public routes only** (admin skipped); default crossfade, no per-link `transitionTypes`.
- 404 is a single root `src/app/not-found.tsx` with its own minimal chrome (no header/footer).
- Error boundaries log via `useEffect(() => console.error(error), [error])` — never `setState` in an effect (project lint errors on `react-hooks/set-state-in-effect`).
- No data/logic changes; the existing Vitest suite (11) must stay green. New total after this slice: 13.
- Respect `prefers-reduced-motion` (disable fade + view-transition animations).
- Node tooling under Node 22: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null`.
- Existing: `(public)/layout.tsx` renders `<Header/> <main>…</main> <Footer/>`; `site` from `@/lib/site` has `{ name }`; `Mdx` (`@/components/mdx/Mdx`) already wraps its output in `.prose`.

---

### Task 1: Enable View Transitions + fade-in CSS

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/(public)/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: public route navigations crossfade; a `.fade-in` utility class + reduced-motion guards.

- [ ] **Step 1: Enable the experimental flag**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: Wrap public content in ViewTransition + fade-in**

Replace `src/app/(public)/layout.tsx` with:

```tsx
import { ViewTransition } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="fade-in mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <ViewTransition>{children}</ViewTransition>
      </main>
      <Footer />
    </>
  );
}
```

Note: with `experimental.viewTransition` on, `ViewTransition` is exported from `react`. If TypeScript cannot find the export, change the import to `import { unstable_ViewTransition as ViewTransition } from "react";` — functionally identical.

- [ ] **Step 3: Add fade-in keyframe + reduced-motion guards to globals.css**

Append to the end of `src/app/globals.css`:

```css
/* --- Motion: gentle first-paint fade + reduced-motion guards --- */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.fade-in {
  animation: fade-in 0.4s ease both;
}
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run build && npm run lint
```
Expected: build succeeds (no error about the `viewTransition` flag), lint clean. Manual: navigating between `/`, `/articles`, `/tags` crossfades.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts "src/app/(public)/layout.tsx" src/app/globals.css
git commit -m "feat(polish): enable view transitions + fade-in motion"
```

---

### Task 2: Custom 404 page

**Files:**
- Create: `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `site.name`; warm-paper tokens.

- [ ] **Step 1: Create the 404 page**

Create `src/app/not-found.tsx`:

```tsx
import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-tight text-ink"
      >
        {site.name}
      </Link>
      <p className="mt-10 font-display text-6xl font-semibold tracking-tight text-terracotta">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm font-prose text-lg text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
      >
        &larr; Back home
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run build && npm run lint
```
Expected: build succeeds, lint clean. Manual: visiting `/articles/does-not-exist` (a `notFound()` path) renders the branded 404 in light and dark.

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat(polish): branded 404 not-found page"
```

---

### Task 3: Error boundaries

**Files:**
- Create: `src/components/site/ErrorState.tsx`
- Create: `src/app/(public)/error.tsx`
- Create: `src/app/admin/error.tsx`
- Create: `src/app/global-error.tsx`

**Interfaces:**
- Produces: `ErrorState` (`{ title?: string; reset?: () => void }`), consumed by the public and admin error boundaries.

- [ ] **Step 1: Shared ErrorState**

Create `src/components/site/ErrorState.tsx`:

```tsx
"use client";

export function ErrorState({
  title = "Something went wrong.",
  reset,
}: {
  title?: string;
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-sm font-prose text-lg text-muted">
        An unexpected error occurred. Please try again.
      </p>
      {reset && (
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong"
        >
          Try again
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Public error boundary**

Create `src/app/(public)/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/site/ErrorState";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState title="Something went wrong." reset={reset} />;
}
```

- [ ] **Step 3: Admin error boundary**

Create `src/app/admin/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/site/ErrorState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState title="Admin error." reset={reset} />;
}
```

- [ ] **Step 4: Global error boundary (self-contained)**

Create `src/app/global-error.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf6ec",
          color: "#2a2017",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#5e5343" }}>
          A critical error occurred. Please reload.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            border: "none",
            borderRadius: "0.375rem",
            background: "#a23b2c",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run build && npm run lint
```
Expected: build succeeds (all error segments compile), lint clean (no `set-state-in-effect`).

- [ ] **Step 6: Commit**

```bash
git add src/components/site/ErrorState.tsx "src/app/(public)/error.tsx" src/app/admin/error.tsx src/app/global-error.tsx
git commit -m "feat(polish): error boundaries (public, admin, global)"
```

---

### Task 4: Admin loading skeleton

**Files:**
- Create: `src/app/admin/loading.tsx`

- [ ] **Step 1: Create the skeleton**

Create `src/app/admin/loading.tsx`:

```tsx
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-border" />
      <div className="h-4 w-72 rounded bg-border" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-md border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run build && npm run lint
```
Expected: build succeeds, lint clean. Manual: navigating to an admin route shows the skeleton briefly before data loads.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/loading.tsx
git commit -m "feat(polish): admin loading skeleton"
```

---

### Task 5: Preview test + ArticleForm tidy + empty states

**Files:**
- Create: `src/lib/actions/preview.test.ts`
- Modify: `src/components/admin/ArticleForm.tsx`
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/app/(public)/articles/page.tsx`

**Interfaces:**
- Consumes: `renderMdxPreview(content: string): Promise<{ ok: true; body: string } | { ok: false; error: string }>` from `@/lib/actions/preview`.

- [ ] **Step 1: Characterization test for renderMdxPreview**

Create `src/lib/actions/preview.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("./auth-guard", () => ({ requireAuth: vi.fn() }));

import { renderMdxPreview } from "./preview";

describe("renderMdxPreview", () => {
  it("strips frontmatter and returns the body", async () => {
    const input = "---\ntitle: Hi\n---\n\n# Heading\n\nBody text.";
    const res = await renderMdxPreview(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.body).not.toContain("title: Hi");
      expect(res.body).toContain("# Heading");
      expect(res.body).toContain("Body text.");
    }
  });

  it("returns plain content unchanged when there is no frontmatter", async () => {
    const res = await renderMdxPreview("Just body.");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.body.trim()).toBe("Just body.");
  });
});
```

- [ ] **Step 2: Run the test (passes — characterizes existing behavior)**

Run: `npm test src/lib/actions/preview.test.ts`
Expected: PASS (2 cases). This documents the already-correct frontmatter-stripping.

- [ ] **Step 3: Tidy ArticleForm preview**

In `src/components/admin/ArticleForm.tsx`:

(a) Rename the preview body state. Change:

```tsx
  const [previewHtml, setPreviewHtml] = useState("");
```
to
```tsx
  const [previewBody, setPreviewBody] = useState("");
```

(b) In the debounced preview effect, change `setPreviewHtml(result.body)` to `setPreviewBody(result.body)`.

(c) In the preview render block, drop the redundant `.prose` wrapper (Mdx already wraps). Change:

```tsx
              ) : previewHtml ? (
                <div className="prose">
                  <Mdx source={previewHtml} />
                </div>
              ) : (
```
to
```tsx
              ) : previewBody ? (
                <Mdx source={previewBody} />
              ) : (
```

- [ ] **Step 4: Polish empty states**

In `src/app/(public)/page.tsx`, replace the empty-state paragraph:

```tsx
          <p className="py-16 text-center text-faint">
            No articles yet. Check back soon.
          </p>
```
with
```tsx
          <div className="py-20 text-center">
            <p className="font-display text-xl font-semibold text-ink">
              No articles yet
            </p>
            <p className="mt-2 font-prose text-muted">Check back soon.</p>
          </div>
```

In `src/app/(public)/articles/page.tsx`, replace:

```tsx
          <p className="py-16 text-center text-faint">
            No articles yet.
          </p>
```
with
```tsx
          <div className="py-20 text-center">
            <p className="font-display text-xl font-semibold text-ink">
              No articles yet
            </p>
            <p className="mt-2 font-prose text-muted">Check back soon.</p>
          </div>
```

- [ ] **Step 5: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 13/13 tests; build succeeds; lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/preview.test.ts src/components/admin/ArticleForm.tsx "src/app/(public)/page.tsx" "src/app/(public)/articles/page.tsx"
git commit -m "test(admin): characterize renderMdxPreview; tidy preview + empty states"
```

---

## Self-Review

**Spec coverage:**
- View Transitions (config flag + public layout wrap + default crossfade) → Task 1. ✓
- Fade-in + reduced-motion guards → Task 1. ✓
- Root `not-found.tsx` with own chrome → Task 2. ✓
- Shared `ErrorState` + public/admin/global error boundaries (log via effect) → Task 3. ✓
- Admin loading skeleton → Task 4. ✓
- `renderMdxPreview` test; ArticleForm rename + drop double `.prose`; empty-state polish → Task 5. ✓
- No data/logic changes; suite stays green (now 13) → every verify step. ✓

**Placeholder scan:** No TBD/TODO; full code for every change. ✓

**Type consistency:** `ErrorState` prop shape `{ title?: string; reset?: () => void }` matches both boundary call sites. Error boundary signature `({ error, reset }: { error: Error & { digest?: string }; reset: () => void })` is identical across the three. `previewBody`/`setPreviewBody` renamed consistently in all three ArticleForm references. ✓

## Notes / Risks

- `experimental.viewTransition` is a Next 16 experimental flag; if a future minor renames it the build will warn — pin matters but is acceptable for a polish slice.
- `ViewTransition` from `react` may surface as `unstable_ViewTransition` depending on the installed React typings; the fallback import is documented in Task 1.
- `global-error.tsx` uses inline hex (paper `#fbf6ec`, ink `#2a2017`, muted `#5e5343`, terracotta `#a23b2c`) because the root layout — and thus the stylesheet — is bypassed when it renders. It is intentionally not dark-mode aware (last-resort fallback).

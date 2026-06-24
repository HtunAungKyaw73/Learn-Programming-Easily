# Phase 7 Slice 4 — Accessibility & Responsive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For tasks with testable logic, follow the project's `test-feature` skill.

**Goal:** Visible focus everywhere, a proper search dialog (arrow-nav + focus trap), a mobile-fit header, and AA-contrast meta text.

**Architecture:** A pure `nextActiveIndex` helper drives keyboard result navigation. `globals.css` gains a `:focus-visible` ring + a darker `faint` token; the public layout gains a skip link. `Search.tsx` becomes a labelled, trapped dialog. The header collapses to a short wordmark + icon-only search on phones.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, TypeScript, Vitest, `eslint-config-next` (includes jsx-a11y).

## Global Constraints

- TypeScript; Tailwind utilities with warm-paper tokens; public components + tokens only (the focus rule also benefits admin). No new deps, no data/logic changes; existing suite (26) stays green.
- Focus is shown via a global `:focus-visible` terracotta outline plus explicit `focus-visible:` utilities where `outline-none` is set.
- Search modal: `role="dialog"` + `aria-modal="true"` + `aria-label`; input `aria-label`; ↑/↓ navigate results (Enter opens the highlighted one); focus trap; return focus to the trigger on close. The active row is highlighted **visually only** (no `aria-selected` — it's invalid on `<button>` and trips jsx-a11y).
- `faint` token: light `#6e6151` (~5.6:1 on paper), dark `#a99c84` (~6.5:1 on dark) — both pass WCAG AA ≥4.5:1.
- Header on mobile: `site.shortName` ("LPE") + icon-only search; full wordmark + "Search ⌘K" at `sm+`.
- Node 22 for tooling: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null`.
- Existing: `Search.tsx` (client) imports `{ createFuse, searchDocs, type SearchDoc }` from `@/lib/search`; `search.test.ts` imports `{ createFuse, searchDocs }`; `(public)/layout.tsx` renders `<Header/> <main class="fade-in …"> <ViewTransition>{children}</ViewTransition> </main> <Footer/>`; `site` has `{ name, shortName, description, url, author }`.

---

### Task 1: `nextActiveIndex` helper (TDD)

**Files:**
- Modify: `src/lib/search.ts`
- Modify: `src/lib/search.test.ts`

**Interfaces:**
- Produces: `nextActiveIndex(current: number, key: "ArrowUp" | "ArrowDown", length: number): number`

- [ ] **Step 1: Write the failing test**

In `src/lib/search.test.ts`, change the import line:

```ts
import { createFuse, searchDocs, nextActiveIndex } from "@/lib/search";
```

and append at the end of the file:

```ts
describe("nextActiveIndex", () => {
  it("ArrowDown increments, clamped at length-1", () => {
    expect(nextActiveIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextActiveIndex(2, "ArrowDown", 3)).toBe(2);
  });
  it("ArrowUp decrements, clamped at 0", () => {
    expect(nextActiveIndex(2, "ArrowUp", 3)).toBe(1);
    expect(nextActiveIndex(0, "ArrowUp", 3)).toBe(0);
  });
  it("returns 0 when there are no results", () => {
    expect(nextActiveIndex(0, "ArrowDown", 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/search.test.ts`
Expected: FAIL — `nextActiveIndex` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/search.ts`:

```ts
/** Next highlighted-result index for arrow-key navigation (clamped to range). */
export function nextActiveIndex(
  current: number,
  key: "ArrowUp" | "ArrowDown",
  length: number,
): number {
  if (length === 0) return 0;
  if (key === "ArrowDown") return Math.min(current + 1, length - 1);
  return Math.max(current - 1, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/search.test.ts`
Expected: PASS (3 new cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts
git commit -m "feat(a11y): nextActiveIndex helper for search arrow-key nav"
```

---

### Task 2: Focus ring, skip link, contrast

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/(public)/layout.tsx`

- [ ] **Step 1: Darken the faint token**

In `src/app/globals.css`, change `--faint` in both blocks:
- In `:root`: `--faint: #8a7c66;` → `--faint: #6e6151;`
- In `.dark`: `--faint: #857a66;` → `--faint: #a99c84;`

- [ ] **Step 2: Add the global focus-visible ring**

Append to `src/app/globals.css`:

```css
/* --- Visible keyboard focus for elements that don't set their own --- */
:focus-visible {
  outline: 2px solid var(--terracotta);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Skip link + main landmark**

Replace the contents of `src/app/(public)/layout.tsx` with:

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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:outline-2 focus:outline-terracotta"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        className="fade-in mx-auto w-full max-w-3xl flex-1 px-6 py-12"
      >
        <ViewTransition>{children}</ViewTransition>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 29/29 tests; build succeeds; lint clean. Manual: Tab on a page shows terracotta focus rings; the first Tab reveals "Skip to content", which jumps to the content.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css "src/app/(public)/layout.tsx"
git commit -m "feat(a11y): focus-visible rings, skip link, AA-contrast faint token"
```

---

### Task 3: Search modal accessibility

**Files:**
- Modify: `src/components/search/Search.tsx`

**Interfaces:**
- Consumes: `nextActiveIndex` (Task 1).

- [ ] **Step 1: Rewrite Search.tsx**

Replace the contents of `src/components/search/Search.tsx` with:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFuse,
  searchDocs,
  nextActiveIndex,
  type SearchDoc,
} from "@/lib/search";

export function Search({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => createFuse(docs), [docs]);
  const results = useMemo(
    () => searchDocs(fuse, query).slice(0, 8),
    [fuse, query],
  );

  // ⌘K / Ctrl-K toggles; Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while open; return focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  function openSearch() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function go(slug: string) {
    setOpen(false);
    router.push(`/articles/${slug}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => nextActiveIndex(a, e.key, results.length));
    }
  }

  // Focus trap: keep Tab within the panel.
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openSearch}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
        aria-label="Search"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-surface px-1.5 font-mono text-xs text-faint sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search articles"
            onKeyDown={onPanelKeyDown}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[active]) go(results[active].slug);
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                aria-label="Search articles"
                placeholder="Search articles…"
                className="w-full border-b border-border bg-transparent px-4 py-3.5 text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              />
            </form>
            <ul className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-faint">
                  No matches
                </li>
              )}
              {results.map((doc, i) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    onMouseEnter={() => setActive(i)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      i === active ? "bg-paper" : "hover:bg-paper"
                    }`}
                  >
                    <span className="block font-medium text-ink">
                      {doc.title}
                    </span>
                    {doc.description && (
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {doc.description}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 29/29; build succeeds; lint clean (no jsx-a11y errors). Manual: ⌘K opens; ↑/↓ move the highlight; Enter opens the highlighted article; Tab cycles within the panel; Esc closes and focus returns to the search button.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/Search.tsx
git commit -m "feat(a11y): search dialog roles, arrow-nav, focus trap, return focus"
```

---

### Task 4: Header responsive wordmark

**Files:**
- Modify: `src/components/site/Header.tsx`

- [ ] **Step 1: Short wordmark on mobile**

In `src/components/site/Header.tsx`, replace the wordmark `Link`:

```tsx
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg"
        >
          <span className="sm:hidden">{site.shortName}</span>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>
```

- [ ] **Step 2: Verify**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: 29/29; build succeeds; lint clean. Manual: at ~360px the header shows "LPE" + magnifier + Articles/Tags + theme toggle with no horizontal scroll; at `sm+` the full wordmark and "Search ⌘K" return.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/Header.tsx
git commit -m "feat(responsive): short wordmark + icon-only search on mobile"
```

---

## Self-Review

**Spec coverage:**
- Global `:focus-visible` ring + input `focus-visible:` utilities → Tasks 2 & 3. ✓
- Skip link + `#main` → Task 2. ✓
- Search dialog roles/labels, ↑/↓ nav (Enter on highlighted), focus trap, return focus → Tasks 1 & 3. ✓
- Header short wordmark + icon-only search → Tasks 3 (search button) & 4 (wordmark). ✓
- `faint` AA contrast bump → Task 2. ✓
- `nextActiveIndex` unit-tested → Task 1. ✓

**Placeholder scan:** No TBD/TODO; full code for every change. ✓

**Type consistency:** `nextActiveIndex(current, key, length)` defined in Task 1 matches the `setActive((a) => nextActiveIndex(a, e.key, results.length))` call in Task 3 (`e.key` is narrowed to `"ArrowUp" | "ArrowDown"` by the preceding `if`). `site.shortName` exists. The input keeps `outline-none` but adds `focus-visible:outline-*` (class beats the base rule and `outline-none` for keyboard focus). ✓

## Notes / Risks

- `aria-selected` is intentionally NOT used on the result `<button>` (invalid for the button role; jsx-a11y would error). The active row is conveyed visually; the dialog/trap/labels carry the a11y semantics.
- The base `:focus-visible` rule (specificity 0,1,0) is overridden by Tailwind `outline-none` utilities; that's why the search input adds explicit `focus-visible:` utilities. Other interactive elements (links, the toggle button, result buttons) don't set `outline-none`, so the base rule applies.
- `nextActiveIndex` takes `e.key` directly; the `onInputKeyDown` guard ensures only the two arrow keys reach it.
- Returning focus on close runs in the scroll-lock effect's cleanup; on navigation the new page takes focus anyway — harmless.

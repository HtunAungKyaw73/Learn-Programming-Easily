# Phase 7 (Slice 4) — Accessibility & Responsive — Design

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Final Phase 7 slice. Fix focus visibility, keyboard access, the search-modal dialog semantics, mobile header overflow, and small-text contrast on the public site. No data/logic changes.

## Goal

Make the public site keyboard- and screen-reader-friendly and comfortable on small screens: visible focus everywhere, a proper search dialog (trap + arrow nav), a header that fits a phone, and meta text that passes WCAG AA.

## Decisions (locked)

- **Focus:** a global `:focus-visible` terracotta outline + explicit `focus-visible:` ring on elements that use `outline-none` (the search input).
- **Skip link** to `#main`.
- **Search modal:** `role="dialog"` + `aria-modal` + labels, ↑/↓ arrow-key result navigation (Enter on the highlighted row), a focus trap, and return-focus to the trigger on close.
- **Header:** short wordmark + icon-only search on mobile.
- **Contrast:** darken `faint` to light `#6E6151` (~5.6:1 on paper) and dark `#A99C84` (~6.5:1 on dark) — both pass AA ≥4.5:1.
- Public + tokens only (the global focus rule also benefits admin); no new deps.

## Components

### Focus + skip link

- `src/app/globals.css`, in a base layer:
  ```css
  :focus-visible {
    outline: 2px solid var(--terracotta);
    outline-offset: 2px;
  }
  ```
  This covers links/buttons that don't set `outline-none`.
- The search `<input>` (which sets `outline-none`) gets explicit utilities so keyboard focus is visible: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta` (a class-level rule beats `outline-none`).
- `src/app/(public)/layout.tsx`: add a skip link as the first child and `id="main"` on `<main>`:
  ```tsx
  <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:outline-2 focus:outline-terracotta">
    Skip to content
  </a>
  ```
  (`sr-only`/`not-sr-only` are Tailwind built-ins.)

### Search modal a11y — `src/components/search/Search.tsx` + `src/lib/search.ts`

- `src/lib/search.ts`: add a pure helper (unit-tested):
  ```ts
  export function nextActiveIndex(
    current: number,
    key: "ArrowUp" | "ArrowDown",
    length: number,
  ): number;
  ```
  `ArrowDown` → `min(current+1, length-1)`; `ArrowUp` → `max(current-1, 0)`; `length === 0` → `0`.
- `Search.tsx`:
  - Track `active` index state; reset to `0` in the input `onChange` (handler, not an effect).
  - Input `onKeyDown`: `ArrowDown`/`ArrowUp` → `e.preventDefault()` + `setActive(nextActiveIndex(active, key, results.length))`; `Enter` (via the form submit) opens `results[active]` (not just `results[0]`).
  - Highlight the active row (`bg-paper`/stronger) and set `aria-selected`.
  - Panel: `role="dialog" aria-modal="true" aria-label="Search articles"`; input: `aria-label="Search articles"`.
  - **Focus trap:** a `panelRef`; on `Tab`/`Shift+Tab` at the first/last focusable element, wrap to the other end.
  - **Return focus:** a `triggerRef` on the open button; on close, `triggerRef.current?.focus()`.
  - The backdrop stays a mouse convenience (click-to-close); keyboard users use `Esc` (already wired). If `jsx-a11y` flags the backdrop `onClick`, add `role="presentation"`.

### Header responsive — `src/components/site/Header.tsx`

- Wordmark: `<span className="sm:hidden">{site.shortName}</span><span className="hidden sm:inline">{site.name}</span>` (`site.shortName` = "LPE").
- Search button (in `Search.tsx`): render a magnifier icon always; wrap the "Search" text in `hidden sm:inline` (the ⌘K `kbd` is already `hidden sm:inline`). Icon-only on phones.

### Contrast — `src/app/globals.css`

- `:root` `--faint: #6e6151;` and `.dark` `--faint: #a99c84;` (replace the current `#8a7c66` / `#857a66`).

## Error / edge handling

- Empty results: arrow keys are no-ops (`length 0` → index 0); Enter does nothing.
- Focus trap with a single focusable element (no results): Tab stays on the input.
- Skip link is invisible until focused; activating it moves focus to `#main`.
- `prefers-reduced-motion` already handled (slice 1); focus outlines are not animated.

## Testing (TDD via `test-feature`)

**`src/lib/search.test.ts`** (extend): `nextActiveIndex` —
- `ArrowDown` increments, clamped at `length-1`.
- `ArrowUp` decrements, clamped at `0`.
- `length === 0` returns `0`.

**Gates:** `npm test` (suite grows), `npm run build`, `npm run lint` (jsx-a11y clean — the lint config is `eslint-config-next`, which includes a11y rules). **Manual (user):** keyboard-only pass (Tab through a page, focus rings visible; ⌘K, arrow-select a result, Esc returns focus to the button; skip link works); mobile pass at ~360px (header fits, no horizontal scroll); confirm meta text reads clearly in light + dark.

## Out of scope

- Admin UI a11y (internal); the global focus rule still helps it.
- Full ARIA combobox/listbox pattern for search (dialog + arrow nav is sufficient here).
- Automated a11y testing (axe) — manual + lint for this slice.
- Palette changes beyond `faint`.

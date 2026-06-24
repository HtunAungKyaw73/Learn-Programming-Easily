# Warm-Paper Editorial Redesign — Design

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Establish a "Warm Paper" editorial design system and restyle the **public** site to it (home, article, articles index, tags, tag detail, search modal, header, footer). Admin routes are NOT touched. No new features — visual layer only.

## Goal

Give the reader-facing site a refined print-magazine identity ("make hard ideas easy") via a cohesive token set, an editorial type system, and restyled public components — without changing routing, data, or behavior.

## Decisions (locked)

- **Aesthetic:** Warm Paper editorial (cream paper, ink, terracotta accent, serif display).
- **Fonts (4 roles):** Fraunces (display headlines), Newsreader (serif article prose), Geist Sans (UI chrome), Geist Mono (code). Fraunces + Newsreader added via `next/font/google`.
- **Drop-cap:** yes, on the first paragraph of article prose.
- **Dark mode:** warm-charcoal palette, switched by `prefers-color-scheme` (consistent with current site; no toggle).
- **Tokens drive everything:** semantic CSS variables in `globals.css`, exposed as Tailwind v4 utilities; components use those utilities, not raw hex.

## Design tokens

Defined in `src/app/globals.css`. Pattern: raw semantic vars under `:root` with a `@media (prefers-color-scheme: dark)` override, then mapped into Tailwind via `@theme inline { --color-*: var(--*) }` so utilities like `bg-paper`, `text-ink`, `text-terracotta` auto-switch by mode.

| token | light | dark | use |
|-------|-------|------|-----|
| `paper` | `#FBF6EC` | `#1A1613` | page background |
| `surface` | `#FFFDF8` | `#221C17` | cards, modal, header |
| `ink` | `#2A2017` | `#ECE3D4` | primary text / headlines |
| `muted` | `#5E5343` | `#B3A892` | body secondary, dek |
| `faint` | `#8A7C66` | `#857A66` | small meta (non-essential only) |
| `border` | `#E7DCC9` | `#3A322A` | hairlines, dividers |
| `terracotta` | `#A23B2C` | `#D9745F` | links, kickers, hover marks |
| `terracotta-strong` | `#872F22` | `#E68B77` | link hover |
| `gold` | `#C9A24B` | `#D8B45E` | featured marks, accent rules |

Fonts mapped: `--font-display` (Fraunces), `--font-prose` (Newsreader), `--font-sans` (Geist Sans, exists), `--font-mono` (Geist Mono, exists). Utilities: `font-display`, `font-prose`.

Accessibility: `ink`/`muted`/`terracotta` on `paper` all meet WCAG AA for their text sizes; `faint` (~3:1) is reserved for small, non-essential meta only. The dark palette mirrors this.

## Type system

- **Display (Fraunces):** home hero, article `h1`, card titles, section headers. Weights 400/600. Tight tracking (`-0.01em`), line-height ~1.1.
- **Prose (Newsreader):** article body via the `.prose` wrapper. ~1.15rem, line-height ~1.7.
- **UI (Geist Sans):** nav, meta rows, tags, buttons, kickers, search input.
- **Code (Geist Mono):** Shiki blocks (unchanged).
- Scale: hero `clamp(2.5rem, 6vw, 3.75rem)`; article `h1` `clamp(2rem, 4vw, 2.75rem)`; card title ~1.5rem.

## Component changes (files)

- `src/app/layout.tsx` — load Fraunces + Newsreader, add their CSS vars to `<html>`; set body to `bg-paper text-ink`.
- `src/app/globals.css` — token vars (light+dark), `@theme` mappings, prose color/font overrides scoped to the warm palette, **drop-cap** rule (`.prose > p:first-of-type::first-letter`: Fraunces, float left, ~3 lines, terracotta), code-block surface tinted to paper, keep existing Shiki dark-mode rules.
- `src/components/site/Header.tsx` — paper/surface bg, Fraunces wordmark, terracotta hover.
- `src/components/site/Footer.tsx` — paper palette, gold hairline.
- `src/components/site/ArticleCard.tsx` — uppercase terracotta **kicker** (first category, fallback first tag) → Fraunces headline → Newsreader dek → Geist-sans meta + tag pills (surface pills, border).
- `src/app/(public)/page.tsx` — Fraunces hero statement on paper; featured lead-in styling.
- `src/app/(public)/articles/[slug]/page.tsx` — article header in Fraunces, refined meta, terracotta tag links.
- `src/app/(public)/articles/page.tsx`, `tags/page.tsx`, `tags/[tag]/page.tsx` — headings to Fraunces, palette to tokens, tag pills restyled.
- `src/components/search/Search.tsx` — modal on `surface`, paper-consistent borders/hover, terracotta focus.
- `src/components/mdx/Mdx.tsx` — `.prose` uses `font-prose`; drop existing zinc prose classes in favor of the warm overrides.

## Out of scope

- Admin UI (`/admin/*`) — stays as-is.
- Routing, data fetching, MDX pipeline, search/RSS logic — unchanged.
- Motion/animation, responsive QA polish, light/dark toggle — these belong to the later Phase 7 polish pass.
- New Shiki theme selection (keep github-light/dark; only tint the surrounding code-block surface).

## Testing / verification

Pure styling — **no unit tests** (asserting on CSS would be theater). Verification is:
1. `npm run build` succeeds and `npm run lint` is clean (fonts load, no type errors, no `react-hooks` regressions).
2. Existing Vitest suite (search/rss/auth) stays green — the redesign must not touch logic.
3. Manual visual review of every public route in **both** light and dark mode: home, an article (drop-cap + prose + code block), articles index, tags, tag detail, and the ⌘K search modal. Confirm tokens switch correctly and no element is unreadable (especially `faint` meta and terracotta-on-paper).

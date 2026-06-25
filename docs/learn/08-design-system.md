# Phase 8 — Design System

> The "warm-paper editorial" look: a magazine aesthetic built on semantic color tokens, serif display + body fonts, and first-class light/dark theming.

> Cross-cutting note: this isn't a numbered build phase like the others — it's the visual identity layered across the public site (see the plan [`warm-paper-editorial-redesign`](../superpowers/plans/2026-06-24-warm-paper-editorial-redesign.md)). It's chaptered here because reviewing the project means understanding *why it looks the way it does*.

## The problem

A programming blog full of default Tailwind grays reads like every other AI-generated site. We wanted something with a point of view — a **warm, printed-magazine** feel — that:

- Stays **consistent** across dozens of components (no one-off hex codes).
- Supports **light and dark** mode without duplicating styles everywhere.
- Makes **long-form reading pleasant** (serif body, generous measure, a drop cap).
- Renders **beautiful code** in both themes.

The hard part is doing this *systematically* so the look can't drift as the project grows.

## The rationale

| Decision | Why |
|---|---|
| **Semantic CSS-variable tokens** | Name colors by *role* (`--ink`, `--paper`, `--terracotta`) not by value. Components reference roles; switching theme just reassigns the variables. |
| **Tailwind v4 `@theme inline`** | v4 lets you map CSS variables to Tailwind color utilities in CSS — so `bg-paper`/`text-ink` are real classes backed by the tokens. No JS config file. |
| **`next-themes`, class strategy** | Industry-standard theme switching: toggles a `.dark` class on `<html>`, persists choice, respects system preference, and avoids the flash-of-wrong-theme on load. |
| **Serif fonts for an editorial voice** | Fraunces (display) + Newsreader (body) read like a magazine; Geist (sans/mono) for UI and code. |

## What was built

- **Design tokens & global styles** — [`src/app/globals.css`](../../src/app/globals.css): the `:root` / `.dark` token sets, the `@theme inline` mapping, prose styling, Shiki theming, the drop cap, motion rules, focus rings.
- **Fonts** — loaded in [`src/app/layout.tsx`](../../src/app/layout.tsx) via `next/font/google` (Fraunces, Newsreader, Geist, Geist Mono) as CSS variables.
- **Theming runtime** — [`components/site/ThemeProvider.tsx`](../../src/components/site/ThemeProvider.tsx), [`ThemeToggle.tsx`](../../src/components/site/ThemeToggle.tsx), [`ThemeToggleButton.tsx`](../../src/components/site/ThemeToggleButton.tsx).
- **One container width** — [`components/site/Container.tsx`](../../src/components/site/Container.tsx), aligning header, footer, and content (`refactor(layout): align header, footer, and content to one container width`).

## How it works

### Semantic tokens, defined twice

[`globals.css`](../../src/app/globals.css) declares the same role names under two selectors — light values on `:root`, dark values on `.dark`:

```css
:root {                       .dark {
  --paper: #fbf6ec;             --paper: #1a1613;
  --ink:   #2a2017;             --ink:   #ece3d4;
  --muted: #5e5343;             --muted: #b3a892;
  --terracotta: #a23b2c;        --terracotta: #d9745f;
  /* …surface, faint, border, gold… */
}                             }
```

**The concept:** a component never says "use `#2a2017`." It says `text-ink`. When `.dark` is on `<html>`, `--ink` becomes a light cream and *every* `text-ink` element flips at once. One variable swap re-themes the whole site — no per-component dark variants needed for color.

### Wiring tokens into Tailwind (v4)

Tailwind v4 reads an `@theme` block from CSS:

```css
@theme inline {
  --color-paper: var(--paper);
  --color-ink:   var(--ink);
  --color-terracotta: var(--terracotta);
  --font-display: var(--font-fraunces);
  --font-prose:   var(--font-newsreader);
  /* … */
}
```

This is what makes `bg-paper`, `text-ink`, `text-terracotta`, `font-display`, `font-prose` exist as utility classes — each one resolves through the token to the active theme's value. There's no `tailwind.config.js`; the design system lives in CSS.

### The dark-mode variant

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This defines what `dark:` means in Tailwind — "when inside a `.dark` element." Combined with `next-themes` putting `.dark` on `<html>`, the `dark:` prefix and the token swap work together.

### Theme switching without the flash

[`ThemeProvider.tsx`](../../src/components/site/ThemeProvider.tsx) wraps the app in `next-themes`:

```tsx
<NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
```

- **`attribute="class"`** — toggles the `.dark` class (matching our variant).
- **`defaultTheme="system"` + `enableSystem`** — respects the OS preference until the user overrides it.
- **`disableTransitionOnChange`** — no jarring color animation when flipping themes.

The root layout sets `suppressHydrationWarning` on `<html>` because `next-themes` writes the class *before* React hydrates (via an inline script) to prevent a flash of the wrong theme — that intentional server/client difference would otherwise warn.

### Editorial prose styling

The `.prose` block (Tailwind Typography, themed with our tokens) does the magazine work:

- **Serif body** (`--font-prose` / Newsreader), larger size, relaxed line height.
- **Display headings** (`--font-fraunces`) with tight tracking.
- **A drop cap** on the first paragraph — the first letter floated large in terracotta:

```css
.prose > p:first-of-type::first-letter {
  font-family: var(--font-display); float: left; font-size: 3.4em; color: var(--terracotta);
}
```

### Code blocks in both themes

Shiki emits dual-theme output (Phase 2); the CSS makes it switch:

```css
.prose pre.shiki { background: var(--surface); border: 1px solid var(--border); }
.dark .prose pre.shiki, .dark .prose pre.shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
```

In light mode you get `github-light`; under `.dark`, the rules swap to Shiki's dark variables. Highlighted and diff lines (from the notation transformers) get their own tinted backgrounds too.

### Motion, with respect

A gentle `fade-in` on page content, and view-transition cross-fades — both disabled under `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .fade-in { animation: none; }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

(The smooth-scroll for anchor links gets the same reduced-motion guard — see [Phase 9](09-table-of-contents.md).)

## Trade-offs & gotchas

- **Tokens must be defined for *both* themes.** Add a new color and forget the `.dark` value, and dark mode shows the light color. Always edit both blocks.
- **`!important` on Shiki dark rules** is deliberate — Shiki sets inline styles, so overriding them needs the weight. Don't "clean it up."
- **`suppressHydrationWarning` is required, not a smell** here — it's the documented way to use `next-themes` without a flash.
- **The design lives in CSS, not JS** — there's no Tailwind config file to look in; `globals.css` *is* the config.

## Explore it yourself

```bash
npm run dev
# toggle the theme (header button); flip your OS appearance to test "system"
# open an article: note the drop cap, serif body, and code colors changing with theme
```

Open:
1. [`src/app/globals.css`](../../src/app/globals.css) — read top to bottom; it's the whole design system.
2. [`src/app/layout.tsx`](../../src/app/layout.tsx) — font loading + `suppressHydrationWarning`.
3. [`components/site/ThemeProvider.tsx`](../../src/components/site/ThemeProvider.tsx) — the switching config.

→ Next: [Phase 9 — Table of Contents](09-table-of-contents.md)

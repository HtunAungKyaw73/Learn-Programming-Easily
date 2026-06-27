# Skills Showcase (About Page) — Design

**Date:** 2026-06-27
**Status:** Draft — awaiting owner review
**Scope:** Add a categorized skills showcase to the public `/about` page: tech skills grouped by category, each rendered as a bordered pill with a monochrome icon that reveals its brand color on hover. Content sourced from the owner's GitHub profile README. Single-author; data in `site.ts`.

## Goal

Let readers see, at a glance, the technologies the author works with — organized by category, visually cohesive with the warm-paper editorial brand at rest, with a subtle brand-color reveal on hover.

## Decisions (locked via brainstorm)

- **Structure:** grouped by named category (Languages, Frontend, Backend, …). No proficiency levels.
- **Item style:** pills with a tech icon — reuse the Tags-page bordered-pill shape (`rounded-full border border-border px-3 py-1.5`) with a 16px icon + label.
- **Color:** monochrome at rest (icon = `currentColor`, inheriting the muted text color), animating to the skill's **brand color on hover**. Color-only transition (reduced-motion unaffected).
- **Icon source — Approach A (inline curated):** each skill carries a single-path SVG (simple-icons style) + its official brand hex, stored in config. No runtime dependency. Sourced from the README badges + simple-icons; magic `logo_search` used where it returns a clean single-path icon.
- **Content:** the owner's GitHub README skills (see below), **full set minus the 3 logo-less concept entries** (OOP, Functional Programming, REST).
- **Data home:** `site.author.skills` (same single-source pattern as `socials`).

## Content (from github.com/HtunAungKyaw73 README)

Brand hex for each comes from the README badge colors / simple-icons official hex (finalized in the plan). Categories and skills:

- **Languages:** C++, JavaScript, TypeScript Python
- **Frontend:** React, Next.js, Redux, Tailwind CSS, MUI, shadcn/ui, Radix UI, Recharts, HTML5, CSS3
- **Frontend Tools:** Axios, Zod, React Hook Form, TanStack Query, RTK Query, Zustand, Sass, Figma, Framer Motion
- **Backend:** Node.js, Express, NestJS, GraphQL
- **Backend Tools:** Swagger, Passport.js, JWT, Next-Auth
- **Databases & ORMs:** MongoDB, PostgreSQL, Neon, Redis, Mongoose, Prisma
- **Containers:** Docker, Kubernetes
- **Testing & QA:** Jest, Vitest, Cypress
- **DevOps & CI/CD:** AWS, Terraform, GitHub Actions, Vercel, Git

Dropped (no clean single-path logo): **OOP, Functional Programming, REST**.

**Icon-availability notes (resolved in the plan):** a few lack a canonical simple-icon — **Zustand, Mongoose, RTK Query** (and possibly **Neon, Recharts**). For each, the plan either curates a single-path icon or, if none is acceptable, drops that one skill (never renders an iconless pill, to keep the icon-pill style consistent). **Brand-black logos** (Next.js, Express, shadcn/ui, JWT, Vercel) use a neutral hover color (the `ink` token) instead of `#000000`, so the hover reveal stays visible in dark mode.

## Data model — `src/lib/site.ts`

Extend `Author` with `skills`:

```ts
export interface Skill {
  name: string;        // "React"
  iconPath: string;    // single SVG path string, drawn in a 0 0 24 24 viewBox
  brandColor: string;  // official hex, e.g. "#61DAFB" (or var(--ink) for brand-black)
}

export interface SkillCategory {
  label: string;       // "Frontend"
  skills: Skill[];
}

// Author gains:  skills: SkillCategory[];
```

`author.skills` is populated with the content above. No other consumers; additive change (existing `site.test.ts` still passes).

## Component — `src/components/site/SkillsShowcase.tsx`

Server Component, presentational, reads `site.author.skills`.

- Outer: a `<section>` with a `font-display` `<h2>` heading, text **"Skills"**.
- Per category: a small uppercase `text-faint` `<h3>` label, then a `flex flex-wrap gap-2` row of pills.
- Per skill — a pill (`<span>` or `<li>`, non-interactive):
  - classes: `group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-ink`
  - inline style: `style={{ "--brand": skill.brandColor }}`
  - icon: 16px `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>` with `skill.iconPath`, classed `text-muted transition-colors duration-200 group-hover:text-[var(--brand)]`
  - label: `skill.name`
- Returns `null` if `skills` is empty.

Renders inside the existing `/about` page below the bio paragraph (the page already wraps content in `<Container>`).

## SEO

Extend the `/about` Person JSON-LD with `knowsAbout: [...all skill names]` (flat array). Single line added to the existing `jsonLd` object.

## Accessibility

- Icons are decorative (`aria-hidden`); the visible label is the accessible name.
- Pills are non-interactive display elements — no link/button semantics, no keyboard target (hover color is decorative only).
- Heading order under the page `<h1>` (author name): section `<h2>` "Skills", category `<h3>` labels — sequential, no skipped levels.
- Contrast: at rest everything uses `text-ink`/`text-muted`/`border-border` (AA in both themes). Brand hover colors are decorative, not the sole carrier of meaning.

## Testing

- Extend `src/lib/site.test.ts` (node-env, pure): assert `author.skills` is non-empty; every category has a non-empty `label` and ≥1 skill; every skill has a non-empty `name`, a non-empty `iconPath`, and a `brandColor` matching `/^(#[0-9a-fA-F]{3,8}|var\(--[a-z-]+\))$/` (hex or a CSS var for brand-black).
- `SkillsShowcase` verified via preview: renders all categories; hover reveals brand color; light/dark legible; mobile wraps with no horizontal scroll.

## Out of scope

- Proficiency levels / bars.
- Linking each pill to docs (kept non-interactive).
- Auto-syncing from GitHub at build/runtime (content is curated into config once).
- Skills on any page other than `/about`.

## File summary

| File | Action |
|------|--------|
| `src/lib/site.ts` | add `Skill`/`SkillCategory` types + `author.skills` content |
| `src/components/site/SkillsShowcase.tsx` | create |
| `src/app/(public)/about/page.tsx` | render `<SkillsShowcase />` below bio; add `knowsAbout` to JSON-LD |
| `src/lib/site.test.ts` | extend with skills-shape assertions |

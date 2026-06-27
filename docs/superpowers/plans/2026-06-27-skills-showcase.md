# Skills Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a categorized, icon-pill skills showcase (monochrome → brand color on hover) to the public `/about` page, driven by skill data in config.

**Architecture:** Skill data (name + single-path SVG + brand hex) lives in a generated `src/lib/skills.ts`, referenced by `site.author.skills`. A presentational `SkillsShowcase` Server Component renders it on `/about`. Icon paths are sourced from simple-icons (fetched via the GitHub API into the scratchpad) plus 4 hand-written generic glyphs for skills with no canonical icon.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind v4, `next/image` (n/a here — inline SVG), Vitest (node env).

## Global Constraints

- Use existing design tokens (ink/muted/faint/border/terracotta); no raw hex in components (skill brand hex lives in data, applied via a CSS var).
- Server Components by default; no `"use client"` in new files.
- No new npm dependencies (icons are inlined, not imported from a package).
- Inline single-path SVGs in a `0 0 24 24` viewBox, `fill="currentColor"`; no icon library at runtime, no emoji.
- Monochrome at rest; brand color only on hover, via `--brand` CSS var. Brand-black logos use `var(--ink)` so hover stays visible in dark mode.
- Atomic commit per task. Branch: `feat/skills-showcase` (already checked out; spec already committed).
- Additive change — no `revalidatePublicSurfaces()` needed.

## Resolved content (category → skill → icon source → brand hex)

`SI:<slug>` = simple-icons path already fetched to `scratchpad/icons/<slug>.svg`. `GLYPH:<name>` = hand-written generic single path (Task 1). `var(--ink)` = brand-black logo (neutral hover).

| Category | Skill | Icon | brandColor |
|---|---|---|---|
| Languages | C++ | SI:cplusplus | #00599C |
| Languages | JavaScript | SI:javascript | #F7DF1E |
| Languages | TypeScript | SI:typescript | #3178C6 |
| Languages | Python | SI:python | #3776AB |
| Frontend | React | SI:react | #61DAFB |
| Frontend | Next.js | SI:nextdotjs | var(--ink) |
| Frontend | Redux | SI:redux | #764ABC |
| Frontend | Tailwind CSS | SI:tailwindcss | #06B6D4 |
| Frontend | MUI | SI:mui | #007FFF |
| Frontend | shadcn/ui | SI:shadcnui | var(--ink) |
| Frontend | Radix UI | SI:radixui | var(--ink) |
| Frontend | Recharts | GLYPH:chart | #8884D8 |
| Frontend | HTML5 | SI:html5 | #E34F26 |
| Frontend | CSS3 | SI:css | #1572B6 |
| Frontend Tools | Axios | SI:axios | #5A29E4 |
| Frontend Tools | Zod | SI:zod | #3E67B1 |
| Frontend Tools | React Hook Form | SI:reacthookform | #EC5990 |
| Frontend Tools | TanStack Query | SI:reactquery | #FF4154 |
| Frontend Tools | RTK Query | SI:redux | #764ABC |
| Frontend Tools | Zustand | GLYPH:layers | var(--ink) |
| Frontend Tools | Sass | SI:sass | #CC6699 |
| Frontend Tools | Figma | SI:figma | #F24E1E |
| Frontend Tools | Framer Motion | SI:framer | #0055FF |
| Backend | Node.js | SI:nodedotjs | #339933 |
| Backend | Express | SI:express | var(--ink) |
| Backend | NestJS | SI:nestjs | #E0234E |
| Backend | GraphQL | SI:graphql | #E10098 |
| Backend Tools | Swagger | SI:swagger | #85EA2D |
| Backend Tools | Passport.js | SI:passport | #34E27A |
| Backend Tools | JWT | SI:jsonwebtokens | var(--ink) |
| Backend Tools | Next-Auth | GLYPH:shield | var(--ink) |
| Databases & ORMs | MongoDB | SI:mongodb | #47A248 |
| Databases & ORMs | PostgreSQL | SI:postgresql | #4169E1 |
| Databases & ORMs | Neon | SI:neon | #00E599 |
| Databases & ORMs | Redis | SI:redis | #FF4438 |
| Databases & ORMs | Mongoose | SI:mongoose | #880000 |
| Databases & ORMs | Prisma | SI:prisma | var(--ink) |
| Containers | Docker | SI:docker | #2496ED |
| Containers | Kubernetes | SI:kubernetes | #326CE5 |
| Testing & QA | Jest | SI:jest | #C21325 |
| Testing & QA | Vitest | SI:vitest | #6E9F18 |
| Testing & QA | Cypress | SI:cypress | #69D3A7 |
| DevOps & CI/CD | AWS | GLYPH:cloud | #FF9900 |
| DevOps & CI/CD | Terraform | SI:terraform | #844FBA |
| DevOps & CI/CD | GitHub Actions | SI:githubactions | #2088FF |
| DevOps & CI/CD | Vercel | SI:vercel | var(--ink) |
| DevOps & CI/CD | Git | SI:git | #F05032 |

47 skills, 9 categories. The 42 simple-icons SVGs are already fetched to the scratchpad icons dir; the 4 GLYPH entries are defined in Task 1.

---

### Task 1: Generate `src/lib/skills.ts` (data) + types in `site.ts`

**Files:**
- Create: `src/lib/skills.ts`
- Modify: `src/lib/site.ts` (add `Skill`/`SkillCategory`/`SkillIcon` types; `import { skills }`; `author.skills: skills`)
- Test: `src/lib/site.test.ts` (extend)

**Interfaces:**
- Produces: `Skill { name: string; iconPath: string; brandColor: string }`, `SkillCategory { label: string; skills: Skill[] }` (exported from `site.ts`); `skills: SkillCategory[]` (exported from `skills.ts`); `site.author.skills`.

- [ ] **Step 1: Add the four generic glyph paths** to a scratch map, and write a generator script `scratchpad/gen-skills.mjs` that emits `src/lib/skills.ts`. The script reads each `SI:<slug>` path's `d` from `scratchpad/icons/<slug>.svg`, uses the GLYPH paths below for the 4 generics, and emits the `skills` array in the exact category/skill/hex order of the table above.

Generic glyph single paths (24×24, stroke-as-fill style not required — these are simple filled/outline paths; use these exact `d` strings):
- `chart` (Recharts): `M3 3v18h18v-2H5V3H3zm4 12h2v4H7v-4zm4-6h2v10h-2V9zm4 3h2v7h-2v-7zm4-5h2v12h-2V7z`
- `layers` (Zustand): `M12 2 2 7l10 5 10-5-10-5zm0 7.5L4.21 6 12 2.5 19.79 6 12 9.5zM2 12l10 5 10-5-1.8-.9L12 14.6 3.8 11.1 2 12zm0 5 10 5 10-5-1.8-.9L12 19.6 3.8 16.1 2 17z`
- `shield` (Next-Auth): `M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3zm0 2.2 6 2.25V11c0 4-2.5 6.8-6 8.8-3.5-2-6-4.8-6-8.8V6.45L12 4.2z`
- `cloud` (AWS): `M19.35 10.04A7.49 7.49 0 0 0 12 4 7.49 7.49 0 0 0 5.1 8.63 5.994 5.994 0 0 0 0 14.5 6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96zM19 18H6a4 4 0 0 1 0-8h.71A5.5 5.5 0 0 1 17 11.5a3 3 0 0 1 2 6.5z`

Generator script (`scratchpad/gen-skills.mjs`):

```js
import { readFileSync, writeFileSync } from "node:fs";

const ICONS = "<SCRATCH>/icons"; // absolute scratchpad icons dir
const GLYPH = {
  chart: "M3 3v18h18v-2H5V3H3zm4 12h2v4H7v-4zm4-6h2v10h-2V9zm4 3h2v7h-2v-7zm4-5h2v12h-2V7z",
  layers: "M12 2 2 7l10 5 10-5-10-5zm0 7.5L4.21 6 12 2.5 19.79 6 12 9.5zM2 12l10 5 10-5-1.8-.9L12 14.6 3.8 11.1 2 12zm0 5 10 5 10-5-1.8-.9L12 19.6 3.8 16.1 2 17z",
  shield: "M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3zm0 2.2 6 2.25V11c0 4-2.5 6.8-6 8.8-3.5-2-6-4.8-6-8.8V6.45L12 4.2z",
  cloud: "M19.35 10.04A7.49 7.49 0 0 0 12 4 7.49 7.49 0 0 0 5.1 8.63 5.994 5.994 0 0 0 0 14.5 6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96zM19 18H6a4 4 0 0 1 0-8h.71A5.5 5.5 0 0 1 17 11.5a3 3 0 0 1 2 6.5z",
};

const si = (slug) => {
  const svg = readFileSync(`${ICONS}/${slug}.svg`, "utf8");
  const m = svg.match(/ d="([^"]+)"/);
  if (!m) throw new Error(`no path in ${slug}`);
  return m[1];
};
const path = (src) => (src.startsWith("SI:") ? si(src.slice(3)) : GLYPH[src.slice(6)]);

// [label, [ [name, iconSrc, brandColor], ... ] ]  — exact order from the plan table
const DATA = [
  ["Languages", [["C++","SI:cplusplus","#00599C"],["JavaScript","SI:javascript","#F7DF1E"],["TypeScript","SI:typescript","#3178C6"],["Python","SI:python","#3776AB"]]],
  ["Frontend", [["React","SI:react","#61DAFB"],["Next.js","SI:nextdotjs","var(--ink)"],["Redux","SI:redux","#764ABC"],["Tailwind CSS","SI:tailwindcss","#06B6D4"],["MUI","SI:mui","#007FFF"],["shadcn/ui","SI:shadcnui","var(--ink)"],["Radix UI","SI:radixui","var(--ink)"],["Recharts","GLYPH:chart","#8884D8"],["HTML5","SI:html5","#E34F26"],["CSS3","SI:css","#1572B6"]]],
  ["Frontend Tools", [["Axios","SI:axios","#5A29E4"],["Zod","SI:zod","#3E67B1"],["React Hook Form","SI:reacthookform","#EC5990"],["TanStack Query","SI:reactquery","#FF4154"],["RTK Query","SI:redux","#764ABC"],["Zustand","GLYPH:layers","var(--ink)"],["Sass","SI:sass","#CC6699"],["Figma","SI:figma","#F24E1E"],["Framer Motion","SI:framer","#0055FF"]]],
  ["Backend", [["Node.js","SI:nodedotjs","#339933"],["Express","SI:express","var(--ink)"],["NestJS","SI:nestjs","#E0234E"],["GraphQL","SI:graphql","#E10098"]]],
  ["Backend Tools", [["Swagger","SI:swagger","#85EA2D"],["Passport.js","SI:passport","#34E27A"],["JWT","SI:jsonwebtokens","var(--ink)"],["Next-Auth","GLYPH:shield","var(--ink)"]]],
  ["Databases & ORMs", [["MongoDB","SI:mongodb","#47A248"],["PostgreSQL","SI:postgresql","#4169E1"],["Neon","SI:neon","#00E599"],["Redis","SI:redis","#FF4438"],["Mongoose","SI:mongoose","#880000"],["Prisma","SI:prisma","var(--ink)"]]],
  ["Containers", [["Docker","SI:docker","#2496ED"],["Kubernetes","SI:kubernetes","#326CE5"]]],
  ["Testing & QA", [["Jest","SI:jest","#C21325"],["Vitest","SI:vitest","#6E9F18"],["Cypress","SI:cypress","#69D3A7"]]],
  ["DevOps & CI/CD", [["AWS","GLYPH:cloud","#FF9900"],["Terraform","SI:terraform","#844FBA"],["GitHub Actions","SI:githubactions","#2088FF"],["Vercel","SI:vercel","var(--ink)"],["Git","SI:git","#F05032"]]],
];

const cats = DATA.map(([label, rows]) => ({
  label,
  skills: rows.map(([name, src, brandColor]) => ({ name, iconPath: path(src), brandColor })),
}));

const out =
  `import type { SkillCategory } from "@/lib/site";\n\n` +
  `// Generated — tech skill icons (single-path SVGs, 0 0 24 24). Icons from\n` +
  `// simple-icons (CC0) except generic glyphs for Recharts/Zustand/Next-Auth/AWS.\n` +
  `export const skills: SkillCategory[] = ${JSON.stringify(cats, null, 2)};\n`;
writeFileSync("src/lib/skills.ts", out);
console.log(`wrote src/lib/skills.ts: ${cats.reduce((n,c)=>n+c.skills.length,0)} skills`);
```

Run it (replace `<SCRATCH>` with the absolute scratchpad path):
`node scratchpad/gen-skills.mjs`

- [ ] **Step 2: Add types + wire into `site.ts`.** Above the `author` const in `src/lib/site.ts` add:

```ts
export interface Skill {
  name: string;
  iconPath: string;
  brandColor: string;
}

export interface SkillCategory {
  label: string;
  skills: Skill[];
}
```

Add `import { skills } from "@/lib/skills";` at the top, add `skills: SkillCategory[];` to the `Author` interface, and `skills,` to the `author` object. (`skills.ts` imports the type from `site.ts`; `site.ts` imports the value from `skills.ts` — value/type-only cycle is fine in TS.)

- [ ] **Step 3: Write the failing test** — extend `src/lib/site.test.ts`:

```ts
describe("site.author.skills", () => {
  it("has categories, each with skills", () => {
    expect(site.author.skills.length).toBeGreaterThan(0);
    for (const cat of site.author.skills) {
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.skills.length).toBeGreaterThan(0);
    }
  });

  it("every skill has a name, an icon path, and a valid brand color", () => {
    const colorRe = /^(#[0-9a-fA-F]{3,8}|var\(--[a-z-]+\))$/;
    for (const cat of site.author.skills) {
      for (const s of cat.skills) {
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.iconPath.length).toBeGreaterThan(0);
        expect(s.brandColor).toMatch(colorRe);
      }
    }
  });
});
```

- [ ] **Step 4: Run tests + typecheck.** `npx vitest run src/lib/site.test.ts` (use Node 22 via nvm) → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/skills.ts src/lib/site.ts src/lib/site.test.ts
git commit -m "feat(skills): add skill data + types to author config"
```

---

### Task 2: `SkillsShowcase` component

**Files:**
- Create: `src/components/site/SkillsShowcase.tsx`

**Interfaces:**
- Consumes: `site.author.skills`, types `SkillCategory`/`Skill`.
- Produces: `SkillsShowcase()` — renders the skills section; `null` if no skills.

- [ ] **Step 1: Create the component.**

```tsx
import { site } from "@/lib/site";

export function SkillsShowcase() {
  const { skills } = site.author;
  if (skills.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Skills
      </h2>
      <div className="mt-6 flex flex-col gap-6">
        {skills.map((category) => (
          <div key={category.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
              {category.label}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <li
                  key={skill.name}
                  style={{ "--brand": skill.brandColor } as React.CSSProperties}
                  className="group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-ink"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="text-muted transition-colors duration-200 group-hover:text-[var(--brand)]"
                  >
                    <path d={skill.iconPath} />
                  </svg>
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify compile.** `npx eslint src/components/site/SkillsShowcase.tsx` → clean; `npx tsc --noEmit` → clean. (Visual verification in Task 3 when it renders on /about.)

- [ ] **Step 3: Commit.**

```bash
git add src/components/site/SkillsShowcase.tsx
git commit -m "feat(skills): add SkillsShowcase component"
```

---

### Task 3: Render on /about + add `knowsAbout` to JSON-LD

**Files:**
- Modify: `src/app/(public)/about/page.tsx`

**Interfaces:**
- Consumes: `SkillsShowcase`, `site.author.skills`.

- [ ] **Step 1: Import + render + extend JSON-LD.** Add `import { SkillsShowcase } from "@/components/site/SkillsShowcase";`. In the `jsonLd` object add a `knowsAbout` line:

```ts
    knowsAbout: author.skills.flatMap((c) => c.skills.map((s) => s.name)),
```

After the bio `<div>...{author.bioLong}...</div>`, render the showcase (still inside `<Container>`):

```tsx
      <SkillsShowcase />
```

- [ ] **Step 2: Verify.** `npx eslint "src/app/(public)/about/page.tsx"` + `npx tsc --noEmit` → clean. Then preview: `/about` shows the Skills section with all categories; hovering a pill reveals its brand color; light + dark legible; at 375px the pills wrap with no horizontal scroll. Confirm `knowsAbout` appears in the page's JSON-LD script.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/(public)/about/page.tsx"
git commit -m "feat(skills): render SkillsShowcase on /about + knowsAbout JSON-LD"
```

---

## Self-Review

**Spec coverage:** grouped categories (Task 1 data) ✓; icon pills + monochrome→brand-hover (Task 2) ✓; inline curated single-path icons + hex (Task 1) ✓; content = GitHub set, concepts dropped, 4 generics for icon-less (Task 1 table) ✓; `site.author.skills` data home (Task 1) ✓; `knowsAbout` JSON-LD (Task 3) ✓; heading order h1→h2→h3 (Task 2) ✓; `site.test.ts` skills assertions (Task 1) ✓; rendered on /about below bio (Task 3) ✓.

Deviation from spec: the bulky `skills` array lives in `src/lib/skills.ts` (referenced by `site.author.skills`) rather than literally inline in `site.ts`, to keep `site.ts` readable. Types stay in `site.ts`.

**Placeholder scan:** none — generator script, glyph paths, hex map, component code, and tests are all concrete.

**Type consistency:** `Skill`/`SkillCategory` defined in `site.ts`, imported by `skills.ts` (type) and `SkillsShowcase` (via `site.author.skills`); `iconPath`/`brandColor`/`name` used identically across the generator, component, and tests.

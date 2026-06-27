# Author Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an author profile to the public site in three surfaces — a `/about` page, a per-article author card, and a homepage intro — driven by one `author` config, and widen the shared container so the new nav item fits.

**Architecture:** One `author` object in `src/lib/site.ts` is the single source of truth. Two new presentational components (`SocialLinks`, `AuthorCard`) render it; the `/about` page composes them directly. The shared `Container` widens `max-w-3xl → max-w-4xl`, which forces the article TOC float to gate at `min-[1376px]` instead of `xl`. All new UI are Server Components using existing design tokens.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, `next/image`, Vitest (node env).

## Global Constraints

- Use existing design tokens (paper/surface/ink/muted/faint/border/terracotta) — no raw hex in components.
- Server Components by default; no `"use client"` in any new file here.
- No new npm dependencies.
- Inline SVG icons (`currentColor`), not an icon library; no emoji.
- Vitest is **node-env only** (no jsdom/testing-library) — unit tests cover `src/lib/` pure logic; components/pages are verified via the preview workflow (`preview_start`, screenshot, `preview_eval` rect checks) + `npx eslint` + `npx tsc --noEmit`.
- Avatar via `next/image` with explicit `width`/`height` (avoid CLS). Image is `public/author.jpg`.
- Atomic commit per task. Branch: `feat/author-profile`.
- No content mutation → no `revalidatePublicSurfaces()` needed.

---

### Task 1: Author config, types, and `site.author` migration

**Files:**
- Modify: `src/lib/site.ts`
- Test: `src/lib/site.test.ts` (create)
- Modify (migration): `src/app/layout.tsx:36`, `src/app/(public)/articles/[slug]/page.tsx:34` + `:68`, `src/components/site/Footer.tsx:9`, `src/lib/rss.ts:13` + `:14`

**Interfaces:**
- Produces: `Author`, `SocialLink`, `SocialPlatform` types; `site.author: Author` (was a string); `site.nav` gains `{ label: "About", href: "/about" }`. Consumers read `site.author.name` for the author's display name.

- [ ] **Step 1: Write the failing test**

Create `src/lib/site.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { site } from "@/lib/site";

describe("site.author config", () => {
  it("exposes the author name as a string", () => {
    expect(typeof site.author.name).toBe("string");
    expect(site.author.name.length).toBeGreaterThan(0);
  });

  it("has short and long bios and an avatar path under /public", () => {
    expect(site.author.bioShort.length).toBeGreaterThan(0);
    expect(site.author.bioLong.length).toBeGreaterThan(0);
    expect(site.author.avatar.startsWith("/")).toBe(true);
  });

  it("lists only known social platforms with absolute or mailto hrefs", () => {
    const allowed = ["github", "linkedin", "email", "twitter", "website"];
    expect(site.author.socials.length).toBeGreaterThan(0);
    for (const s of site.author.socials) {
      expect(allowed).toContain(s.platform);
      expect(/^(https?:\/\/|mailto:)/.test(s.href)).toBe(true);
    }
  });

  it("includes an About entry in the nav", () => {
    expect(site.nav.some((n) => n.href === "/about")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/site.test.ts`
Expected: FAIL — `site.author.name` is undefined (author is currently a string) and no `/about` nav entry.

- [ ] **Step 3: Update `src/lib/site.ts`**

Add the types above the `site` object, define `author` as a typed const, replace the `author` string and extend `nav`:

```ts
export type SocialPlatform =
  | "github"
  | "linkedin"
  | "email"
  | "twitter"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  href: string;
}

export interface Author {
  name: string;
  tagline?: string;
  bioShort: string;
  bioLong: string;
  avatar: string;
  socials: SocialLink[];
}

const author: Author = {
  name: "Htun Aung Kyaw",
  bioShort:
    "Full-stack developer who turns complex problems into simple, intuitive designs.",
  bioLong:
    "I'm a developer with a strong foundation in both front-end and back-end technologies. I enjoy turning complex problems into simple, beautiful, and intuitive designs. I love to learn new things and am always looking to expand my skillset.",
  avatar: "/author.jpg",
  socials: [
    { platform: "github", href: "https://github.com/HtunAungKyaw73" },
    {
      platform: "linkedin",
      href: "https://www.linkedin.com/in/htun-aung-kyaw-385285352/",
    },
    { platform: "email", href: "mailto:htunaungkyaw730@gmail.com" },
  ],
};
```

In the `site` object: replace `author: "Htun Aung Kyaw",` with `author,` and update `nav`:

```ts
  nav: [
    { label: "Articles", href: "/articles" },
    { label: "Tags", href: "/tags" },
    { label: "About", href: "/about" },
  ],
```

(Keep `export const site = { ... } as const;`. Because `author` is a typed const referenced by name, `as const` does not narrow it into a readonly conflict.)

- [ ] **Step 4: Migrate the 6 `site.author` string consumers to `site.author.name`**

`src/app/layout.tsx:36` → `authors: [{ name: site.author.name }],`
`src/app/(public)/articles/[slug]/page.tsx:34` → `authors: [{ name: site.author.name }],`
`src/app/(public)/articles/[slug]/page.tsx:68` → `authorName: site.author.name,`
`src/components/site/Footer.tsx:9` → `© {new Date().getFullYear()} {site.author.name}`
`src/lib/rss.ts:13` → `copyright: \`© ${new Date().getFullYear()} ${site.author.name}\`,`
`src/lib/rss.ts:14` → `author: { name: site.author.name },`

- [ ] **Step 5: Run the full suite + typecheck to verify pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS — `site.test.ts` green; existing `rss.test.ts` / `seo.test.ts` still green (they exercise author); no type errors. Then `grep -rn "site.author\b" src` shows zero bare-string uses (every hit is `site.author.name` or `site.author.<field>`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/site.ts src/lib/site.test.ts src/app/layout.tsx "src/app/(public)/articles/[slug]/page.tsx" src/components/site/Footer.tsx src/lib/rss.ts
git commit -m "feat(author): add author config object; migrate site.author to object"
```

---

### Task 2: `SocialLinks` component

**Files:**
- Create: `src/components/site/SocialLinks.tsx`

**Interfaces:**
- Consumes: `SocialLink` from `@/lib/site`.
- Produces: `SocialLinks({ socials, className }: { socials: SocialLink[]; className?: string })` — a row of icon links; renders `null` when `socials` is empty; email uses `mailto:` (no `target`), others open in a new tab.

- [ ] **Step 1: Create the component**

```tsx
import type { SocialLink, SocialPlatform } from "@/lib/site";

const LABELS: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  email: "Email",
  twitter: "X (Twitter)",
  website: "Website",
};

const ICONS: Record<SocialPlatform, React.ReactNode> = {
  github: (
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  twitter: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
};

export function SocialLinks({
  socials,
  className = "",
}: {
  socials: SocialLink[];
  className?: string;
}) {
  if (socials.length === 0) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {socials.map((s) => {
        const external = s.platform !== "email";
        const isTwitter = s.platform === "twitter";
        return (
          <a
            key={s.platform}
            href={s.href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            aria-label={LABELS[s.platform]}
            title={LABELS[s.platform]}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isTwitter ? "currentColor" : "none"}
              stroke={isTwitter ? "none" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {ICONS[s.platform]}
            </svg>
          </a>
        );
      })}
    </div>
  );
}
```

(Note: the X/Twitter glyph is a filled path, so it sets `fill="currentColor"` and no stroke; the others are stroked line icons.)

- [ ] **Step 2: Verify it compiles**

Run: `npx eslint src/components/site/SocialLinks.tsx && npx tsc --noEmit`
Expected: clean (no errors). Visual verification happens in Task 4 where it first renders on `/about`.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/SocialLinks.tsx
git commit -m "feat(author): add SocialLinks icon-row component"
```

---

### Task 3: `AuthorCard` component

**Files:**
- Create: `src/components/site/AuthorCard.tsx`

**Interfaces:**
- Consumes: `site.author`, `SocialLinks`, `next/image`.
- Produces: `AuthorCard({ variant, className }: { variant?: "article" | "home"; className?: string })`. `variant="article"` = bordered surface card with "Written by" eyebrow + "More about me →" link. `variant="home"` = borderless inline row.

- [ ] **Step 1: Create the component**

```tsx
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { SocialLinks } from "@/components/site/SocialLinks";

export function AuthorCard({
  variant = "article",
  className = "",
}: {
  variant?: "article" | "home";
  className?: string;
}) {
  const { author } = site;

  if (variant === "home") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <Image
          src={author.avatar}
          alt={author.name}
          width={56}
          height={56}
          className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">
            {author.name}
          </p>
          <p className="mt-0.5 text-sm text-muted">{author.bioShort}</p>
          <SocialLinks socials={author.socials} className="mt-1.5 -ml-2" />
        </div>
      </div>
    );
  }

  return (
    <aside className="mt-12 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-start">
      <Image
        src={author.avatar}
        alt={author.name}
        width={64}
        height={64}
        className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint">
          Written by
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ink">
          {author.name}
        </p>
        <p className="mt-1 text-sm text-muted">{author.bioShort}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <SocialLinks socials={author.socials} className="-ml-2" />
          <Link
            href="/about"
            className="text-sm text-terracotta transition-colors hover:underline"
          >
            More about me →
          </Link>
        </div>
      </div>
    </aside>
  );
}
```

(`className` param is consumed only by the `home` variant; the `article` variant has a fixed `mt-12` wrapper. This matches the two call sites in Tasks 5–6.)

- [ ] **Step 2: Verify it compiles**

Run: `npx eslint src/components/site/AuthorCard.tsx && npx tsc --noEmit`
Expected: clean. Visual verification in Tasks 5–6.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/AuthorCard.tsx
git commit -m "feat(author): add AuthorCard (article + home variants)"
```

---

### Task 4: `/about` page (+ nav link already added in Task 1)

**Files:**
- Create: `src/app/(public)/about/page.tsx`

**Interfaces:**
- Consumes: `Container`, `SocialLinks`, `site.author`, `next/image`.

- [ ] **Step 1: Create the page**

```tsx
import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/site/Container";
import { SocialLinks } from "@/components/site/SocialLinks";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: site.author.bioShort,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const { author } = site;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    description: author.bioShort,
    image: `${site.url}${author.avatar}`,
    url: `${site.url}/about`,
    sameAs: author.socials
      .filter((s) => s.platform !== "email")
      .map((s) => s.href),
  };

  return (
    <Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Image
          src={author.avatar}
          alt={author.name}
          width={120}
          height={120}
          priority
          className="h-28 w-28 flex-shrink-0 rounded-full object-cover"
        />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {author.name}
          </h1>
          <SocialLinks socials={author.socials} className="mt-2 -ml-2" />
        </div>
      </div>
      <div className="mt-8 max-w-2xl font-prose text-lg leading-relaxed text-muted">
        <p>{author.bioLong}</p>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Verify compile + render**

Run: `npx eslint "src/app/(public)/about/page.tsx" && npx tsc --noEmit` → clean.
Then `preview_start`, navigate to `/about`. Expected: avatar (round, not stretched), name heading, GitHub/LinkedIn/Email icons, bio paragraph. Confirm nav now shows **About** with active styling on this route. `preview_eval`: `document.querySelectorAll('main a[aria-label]').length === 3` and avatar `naturalWidth > 0` (image loaded).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/about/page.tsx"
git commit -m "feat(author): add /about page with Person JSON-LD"
```

---

### Task 5: Homepage author intro

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `AuthorCard`.

- [ ] **Step 1: Add the intro to the hero section**

Add the import:

```tsx
import { AuthorCard } from "@/components/site/AuthorCard";
```

Inside the first `<section className="border-b border-border pb-12">`, after the description `<p>...</p>`, add:

```tsx
        <AuthorCard variant="home" className="mt-8" />
```

- [ ] **Step 2: Verify render**

Run: `npx eslint "src/app/(public)/page.tsx" && npx tsc --noEmit` → clean.
`preview_start`, home `/`. Expected: avatar + name + one-line bio + social icons sit under the hero description, above the divider. No layout shift; avatar loaded. Check 375px: row stays readable, no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(author): add author intro to homepage hero"
```

---

### Task 6: Per-article author card

**Files:**
- Modify: `src/app/(public)/articles/[slug]/page.tsx`

**Interfaces:**
- Consumes: `AuthorCard`.

- [ ] **Step 1: Add the card after the article body**

Add the import:

```tsx
import { AuthorCard } from "@/components/site/AuthorCard";
```

Inside `<article>`, immediately after the `<div className="mt-8"><Mdx source={content} /></div>` block (before `</article>`), add:

```tsx
        <AuthorCard variant="article" />
```

- [ ] **Step 2: Verify render**

Run: `npx eslint "src/app/(public)/articles/[slug]/page.tsx" && npx tsc --noEmit` → clean.
`preview_start`, open `/articles/hello-world`. Expected: bordered surface card at the bottom of the article with "Written by", name, bio, socials, and "More about me →" linking to `/about`. Click it → lands on `/about`. Card sits within the reading column width.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/articles/[slug]/page.tsx"
git commit -m "feat(author): add author card to article footer"
```

---

### Task 7: Widen container to 4xl + fix article TOC gutter breakpoint

**Files:**
- Modify: `src/components/site/Container.tsx`
- Modify: `src/app/(public)/articles/[slug]/page.tsx` (TOC aside + inline `<details>` breakpoints)

**Interfaces:**
- Consumes: nothing new. Changes the global content width and the article TOC gate.

- [ ] **Step 1: Widen the container**

`src/components/site/Container.tsx`: change `max-w-3xl` → `max-w-4xl` (keep `mx-auto w-full px-6`).

- [ ] **Step 2: Raise the TOC float breakpoint**

In `src/app/(public)/articles/[slug]/page.tsx`:
- The inline collapsible TOC currently `... xl:hidden` → change to `... min-[1376px]:hidden`.
- The sidebar aside currently `absolute inset-y-0 left-full ml-8 hidden w-52 xl:block` → change `xl:block` to `min-[1376px]:block`.

Rationale: at `max-w-4xl` (896px) the right gutter only clears the `left-full + ml-8(32) + w-52(208) = 240px` sidebar when viewport ≥ `896 + 480 = 1376px`. Below that, readers get the inline "Contents" disclosure.

- [ ] **Step 3: Verify widths + TOC at three widths**

Run: `npx eslint "src/components/site/Container.tsx" "src/app/(public)/articles/[slug]/page.tsx" && npx tsc --noEmit` → clean.
`preview_start`. Then:
- At **1440×900**, home `/`: `preview_eval` that header inner, `main .max-w-4xl`, and footer inner share identical `left`/`right` (aligned chrome). Width ≈ 896.
- Article at **1440**: TOC sidebar visible in the right gutter; `aside.getBoundingClientRect().right <= innerWidth` (no overflow); reading column right edge aligns with header.
- Article at **1280**: sidebar hidden, inline "Contents" `<details>` present (`document.querySelector('main details')` truthy), `scrollWidth <= innerWidth`.
- Article at **1536**: sidebar visible, no overflow.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/Container.tsx "src/app/(public)/articles/[slug]/page.tsx"
git commit -m "refactor(layout): widen container to 4xl; gate TOC float at min-[1376px]"
```

---

## Self-Review

**Spec coverage:**
- A `/about` page → Task 4. ✓
- B per-article card → Task 6. ✓
- C homepage intro → Task 5. ✓
- Container 4xl → Task 7. ✓
- Author data model + migration → Task 1. ✓
- `SocialLinks` (provided platforms only) → Task 2. ✓
- `AuthorCard` (two variants) → Task 3. ✓
- About nav link → Task 1 (`site.nav`). ✓
- TOC gutter breakpoint → Task 7. ✓
- SEO Person JSON-LD + metadata → Task 4. ✓
- Avatar via next/image → Tasks 3, 4. ✓

**Type consistency:** `Author`/`SocialLink`/`SocialPlatform` defined in Task 1; `SocialLinks` (Task 2) and `AuthorCard` (Task 3) consume them; `AuthorCard` variant union `"article" | "home"` used identically at call sites (Tasks 5–6). `site.author.name` used consistently across all migrated consumers.

**Placeholder scan:** none — all steps contain full code, exact paths, and concrete verification commands.

## Final verification (after all tasks)

- `npx vitest run` (all green) + `npx tsc --noEmit` (clean) + `npx eslint` (clean).
- Preview pass: `/about`, homepage intro, article card all render with the real avatar; About nav link active; dark mode legible; 375 / 1280 / 1376 / 1536px all free of horizontal scroll.
- `git grep -n "site.author\b"` shows only `site.author.<field>` accesses, no bare-string use.

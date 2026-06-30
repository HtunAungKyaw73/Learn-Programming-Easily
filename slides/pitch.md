---
marp: true
paginate: true
transition: fade
auto-advance: 20
---

# Who's my person?
Meet **[HtunAungKyaw73](https://github.com/HtunAungKyaw73)** — a self-taught developer in Myanmar who wants to share programming knowledge with their local community.

**The Dream:** Write clean, well-formatted programming articles with syntax-highlighted code blocks and publish them online — no WordPress bloat, no Medium paywalls.

**The Roadblocks:**
* Existing platforms (WordPress, Ghost) are overkill for a single author — heavy, expensive, and hard to customize.
* Dev.to and Medium own your content and bury it behind algorithms.
* They need a **lightweight, self-hosted CMS** with a proper admin panel, fast search, and beautiful code rendering — built with modern tools they can extend.

---

# Their Problem
| Pain Point | The Harsh Reality |
|------|---------|
| 📝 **Content Ownership** | Platforms like Medium control distribution; your articles live in their walled garden. |
| 🏋️ **Heavy CMSs** | WordPress/ Ghost require plugins, themes, and server management just to post an article. |
| 🔍 **No Fast Search** | Most static blogs have no search — readers must scroll through archives manually. |
| 🎨 **Poor Code Display** | Generic blog platforms butcher syntax highlighting for multi-language code snippets. |
| 📱 **SEO Neglect** | DIY blogs skip structured data, Open Graph images, and sitemaps — Google can't find them. |
| 🔐 **No Admin Control** | Static site generators have no UI — you edit YAML files and pray the build works. |

A solo developer wants to **write and publish**, not wrestle with infrastructure. They need a CMS that gets out of the way.

---

# What I Built
**Learn Programming Easily** — a single-author CMS for programming articles.

**The Hybrid Content Pipeline:**
1. 📝 **Write** → Author writes articles as `.mdx` files (version-controlled, IDE-editable)
2. 🗄️ **Sync** → Metadata (title, tags, status, dates) stored in PostgreSQL via Prisma
3. 🎨 **Render** → MDX + Shiki syntax highlighting with dual light/dark themes
4. ⚡ **Serve** → Static site generation (SSG) for blazing-fast public pages
5. 🔍 **Search** → Instant client-side search via Fuse.js (Cmd+K)
6. 📡 **Distribute** → RSS 2.0 feed, sitemap, BlogPosting JSON-LD, dynamic OG images
7. 🔐 **Admin** → Auth-protected panel for article CRUD via Server Actions

**Result:** Write MDX, click publish, readers get a fast SEO-optimized programming blog.

---

# How I Built It
**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, PostgreSQL, Prisma 7, Auth.js v5

| AI Tooling | Contribution to the Project |
|------|------------|
| 🔌 **MCP: Context7** | Fetched live docs for Next.js, Prisma 7, Auth.js v5, Tailwind v4 during implementation |
| 🔌 **MCP: 21st.dev** | Generated and refined UI components (cards, forms, navigation, search dialog) |
| 🎯 **Skill: test-feature** | TDD discipline — every feature with logic gets a Vitest test before marking done |
| 🤖 **Agent: test-runner** | Lightweight Haiku agent for instant Vitest pass/fail feedback in-session |
| 📋 **Spec: CLAUDE.md** | Single source of truth — architecture, schema, conventions, phased plan drove all implementation |

**Methodology:** Superpowers — Spec Driven Development. The full architecture and phased plan were defined before writing a single line of code.

---

# Why It Matters
**For Solo Developers:**
- A **hybrid content model** — MDX files for prose (git-diffable, IDE-editable) + PostgreSQL for metadata (fast queries, relational power). Best of both worlds.
- **Zero-config publishing** — write, sync, deploy. No CMS plugins, no build scripts to maintain.
- Full **SEO out of the box** — sitemap, robots.txt, JSON-LD, OG images, canonical URLs. Google finds your articles on day one.

**Technical Depth:**
- **Auth.js v5 credentials provider** — single admin with bcrypt + JWT, no external adapter needed.
- **Server Actions for mutations** — no API route boilerplate; forms call server functions directly.
- **Shiki dual themes** — code blocks render beautifully in both light and dark mode.

**The Superpowers Advantage:**
Spec Driven Development kept implementation aligned with design intent across 8+ phases. Every commit traces back to a documented requirement in the project spec — no drift, no wasted effort.

---

# Done Checklist
- [x] **Repo public** — [github.com/HtunAungKyaw73/Learn-Programming-Easily](https://github.com/HtunAungKyaw73/Learn-Programming-Easily)
- [x] **MCP used** — Context7 (Live Docs) + 21st.dev (UI Components)
- [x] **Skill used** — `test-feature` (TDD discipline)
- [x] **Agent used** — `test-runner` (Vitest feedback)
- [x] **Methodology** — Superpowers (Spec Driven Development)
- [x] **Report generated** — [View report.md](https://github.com/HtunAungKyaw73/Learn-Programming-Easily/blob/main/report.md)

**Live at:** `https://articles.htunaungkyaw.online`

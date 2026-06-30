---
marp: true
paginate: true
transition: fade
size: 16:9
title: Learn Programming Easily — Product Intro
style: |
  :root {
    --paper: #FAF5EA;
    --paper-2: #F3ECDC;
    --ink: #2B2622;
    --ink-soft: #5C5247;
    --brick: #B0432B;
    --line: #E2D7C2;
  }
  section {
    background: var(--paper);
    color: var(--ink);
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 26px;
    line-height: 1.5;
    padding: 64px 72px;
  }
  h1, h2, h3 {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  h1 { font-size: 60px; line-height: 1.05; margin: 0 0 .2em; }
  h2 { font-size: 40px; margin: 0 0 .5em; }
  h2::after {
    content: ""; display: block; width: 64px; height: 4px;
    background: var(--brick); margin-top: 14px; border-radius: 2px;
  }
  strong { color: var(--brick); }
  a { color: var(--brick); text-decoration: none; }
  table { font-size: 22px; border-collapse: collapse; }
  th { background: var(--paper-2); text-align: left; }
  th, td { border: 1px solid var(--line); padding: 8px 14px; }
  code {
    background: var(--paper-2); color: var(--brick);
    padding: 1px 7px; border-radius: 5px; font-size: 0.85em;
  }
  ul { margin-top: .2em; }
  li { margin: .25em 0; }
  section.lead { display: flex; flex-direction: column; justify-content: center; }
  section.lead h1 { font-size: 72px; }
  .tag {
    display: inline-block; background: var(--brick); color: var(--paper);
    font-size: 16px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; padding: 4px 12px; border-radius: 999px;
  }
  .muted { color: var(--ink-soft); }
  section.dark { background: #211D1A; color: #F3ECDC; }
  section.dark h1, section.dark h2, section.dark h3 { color: #F3ECDC; }
  section.dark strong { color: #E0795F; }
  section.dark a { color: #E0795F; }
  footer, header { color: var(--ink-soft); }
  section::after { color: var(--ink-soft); }
  img { border-radius: 10px; box-shadow: 0 8px 30px rgba(43,38,34,.18); }
---

<!-- _class: lead -->
<!-- _paginate: false -->

<span class="tag">Programming CMS</span>

# Learn Programming Easily

### Write in MDX. Publish a fast, beautiful programming blog.

<span class="muted">A lightweight, self-hosted CMS for a single author — by [HtunAungKyaw73](https://github.com/HtunAungKyaw73)</span>

---

## What it is

**Learn Programming Easily** is a single-author CMS for publishing programming articles — without the bloat of WordPress or the walled gardens of Medium.

It uses a **hybrid content model**:

- 📝 Article body lives as **`.mdx` files** — version-controlled, IDE-editable
- 🗄️ Metadata (title, tags, status, dates) lives in **PostgreSQL**
- ⚡ Public pages are **statically generated** for speed and SEO

> Write Markdown, click publish, own your content.

---

## Who it's for

| Audience | Why they need it |
|---|---|
| 🧑‍💻 **Solo developers** | Want to publish technical writing without running a heavy CMS |
| ✍️ **Technical writers** | Need clean prose + flawless multi-language code blocks |
| 🌏 **Community educators** | Share knowledge locally, keep full ownership of content |
| 🛠️ **Tinkerers** | Want a modern, extensible codebase they actually control |

The person who wants to **write and publish** — not wrestle with infrastructure.

---

## What it does

- 🎨 **Beautiful code** — Shiki syntax highlighting, light + dark themes
- 🔍 **Instant search** — client-side Fuse.js, ⌘K from anywhere
- 🗂️ **Tags & categories** — browsable, organized archives
- 🧭 **Table of contents** — auto-generated, scroll-synced per article
- 🔐 **Admin panel** — auth-protected CRUD via Server Actions
- 📡 **Built-in distribution** — RSS 2.0 feed, sitemap, JSON-LD, OG images
- 📱 **SEO + responsive** — fast pages Google can actually find

---

## See it — the reading experience

![w:540](../screenshots/home.png) ![w:540](../screenshots/home-dark.png)

<span class="muted">Warm-paper editorial design with one-click **light / dark** mode.</span>

---

## See it — articles & navigation

![w:620](../screenshots/article-react.png)

MDX content with **syntax-highlighted code**, a scroll-synced **table of contents**, tags, and reading time — built for long technical reads.

---

## Under the hood

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma 7 · Auth.js v5 · Shiki · Fuse.js

- **Server Components by default** — `"use client"` only where needed
- **Server Actions** for mutations — no API-route boilerplate
- **Auth.js v5 credentials** — single admin, bcrypt + JWT, no adapter
- **SSG public site** — admin panel dynamic behind auth
- Built with **Spec-Driven Development** — architecture defined before code

---

<!-- _class: dark -->

## Get started

**Live:** `https://articles.htunaungkyaw.online`

**Code:** [github.com/HtunAungKyaw73/Learn-Programming-Easily](https://github.com/HtunAungKyaw73/Learn-Programming-Easily)

```bash
git clone https://github.com/HtunAungKyaw73/Learn-Programming-Easily
npm install
npm run dev   # → localhost:3000
```

### Write. Publish. Own your words.

# Chapter 11 — GFM Table Support in MDX

> Enable pipe-delimited Markdown tables inside MDX article bodies by adding `remark-gfm`.

## The problem

MDX uses the [CommonMark](https://commonmark.org/) spec by default. CommonMark does **not** include tables. When you write this in an article body:

```md
| Level | Complexity | Production Ready |
|-------|-----------|-----------------|
| Pure CSS | ⭐ | ❌ |
| next-themes | ⭐⭐ | ✅✅ |
```

Without GFM support, MDX sees the pipe characters as literal text — the whole block renders as a paragraph of `|` symbols, not a table.

## Why tables aren't in CommonMark

Tables are a GitHub Flavored Markdown (GFM) extension. GFM is a superset of CommonMark that GitHub ships for READMEs and issues. Because it isn't part of the standard spec, remark (the Markdown parser MDX uses internally) doesn't parse it unless you add the plugin.

## The fix: `remark-gfm`

`remark-gfm` is an official remark plugin that adds the GFM extensions:

- **Tables** (pipe-delimited rows)
- Strikethrough (`~~text~~`)
- Autolinks (`https://...` without angle brackets)
- Task list items (`- [ ]`)

For this project the main need is tables, but all four extensions activate together.

## Setup

### 1. Install

```bash
npm install remark-gfm
```

### 2. Wire into `MDXRemote`

In [`src/components/mdx/Mdx.tsx`](../../src/components/mdx/Mdx.tsx), pass `remarkGfm` to the `remarkPlugins` array inside `mdxOptions`:

```tsx
import remarkGfm from "remark-gfm";

export function Mdx({ source }: { source: string }) {
  return (
    <div className="prose max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],   // ← add this
            rehypePlugins: [
              rehypeSlug,
              [rehypeShiki, { /* ... */ }],
            ],
          },
        }}
      />
    </div>
  );
}
```

`remarkPlugins` runs before the HTML is generated. `remark-gfm` teaches the parser to recognise the table syntax first, so by the time rehype and Shiki run, the table is already a proper AST node.

### 3. Styling

No extra work needed. Tailwind Typography's `prose` class already styles `<table>`, `<thead>`, `<th>`, `<td>`, etc. As long as the wrapper div has `prose`, rendered tables pick up the correct typography and border styles automatically.

## Plugin order matters

Remark plugins run in array order, left to right. `remarkGfm` must come before any plugin that expects well-formed AST nodes (though in practice it's the only remark plugin here, so order isn't a concern yet). Rehype plugins run separately, after the full remark pass.

```
source MDX
  → remark parse (CommonMark)
  → remarkGfm  ← extends parser with GFM nodes
  → remark-to-rehype (Markdown AST → HTML AST)
  → rehypeSlug ← adds id attrs to headings
  → rehypeShiki ← syntax-highlights code blocks
  → HTML string
```

## What you can write in articles now

```md
| Method | Time | Space |
|--------|------|-------|
| Brute force | O(n²) | O(1) |
| Hash map | O(n) | O(n) |
| Two pointers | O(n) | O(1) |

~~old approach~~ replaced by two-pointer technique.

- [x] Understand the problem
- [ ] Write tests
- [ ] Optimize

Visit https://example.com for more.
```

All four GFM extensions are active.

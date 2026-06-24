import "dotenv/config";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// One-time / repeatable sync of the MDX files in /content into the database.
// MDX frontmatter is the source of truth; this upserts Article + Tag + Category
// rows so the DB-driven public listings match what's on disk. Idempotent.
// Run with: npm run content:import  (Node 22+)

const CONTENT_DIR = path.join(process.cwd(), "content");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readingTime(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

interface Frontmatter {
  title?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  published?: boolean;
  featured?: boolean;
  publishedAt?: string;
  coverImage?: string;
}

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log("No content directory — nothing to import.");
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  let created = 0;
  let updated = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as Frontmatter;

    const tagConnect: { id: number }[] = [];
    for (const name of fm.tags ?? []) {
      const t = await prisma.tag.upsert({
        where: { name },
        create: { name, slug: slugify(name) },
        update: {},
      });
      tagConnect.push({ id: t.id });
    }

    const catConnect: { id: number }[] = [];
    for (const name of fm.categories ?? []) {
      const c = await prisma.category.upsert({
        where: { name },
        create: { name, slug: slugify(name) },
        update: {},
      });
      catConnect.push({ id: c.id });
    }

    const base = {
      title: fm.title ?? slug,
      description: fm.description ?? null,
      published: fm.published ?? false,
      featured: fm.featured ?? false,
      publishedAt: fm.publishedAt ? new Date(fm.publishedAt) : null,
      coverImage: fm.coverImage ?? null,
      readingTime: readingTime(content),
    };

    const exists = await prisma.article.findUnique({ where: { slug } });
    if (exists) {
      await prisma.article.update({
        where: { slug },
        data: { ...base, tags: { set: tagConnect }, categories: { set: catConnect } },
      });
      updated++;
    } else {
      await prisma.article.create({
        data: { slug, ...base, tags: { connect: tagConnect }, categories: { connect: catConnect } },
      });
      created++;
    }
    console.log(`  synced ${slug} (${base.published ? "published" : "draft"})`);
  }

  console.log(`Done. created=${created}, updated=${updated}, files=${files.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

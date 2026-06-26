import "dotenv/config";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// One-time: copy each content/<slug>.mdx body into Article.body, keyed by slug.
// Run once per environment with: npm run backfill:body  (Node 22+)

const CONTENT_DIR = path.join(process.cwd(), "content");

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("No content directory — nothing to backfill.");
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { content } = matter(raw);
    const res = await prisma.article.updateMany({
      where: { slug },
      data: { body: content },
    });
    console.log(`${slug}: ${res.count} row(s) updated`);
  }

  const missing = await prisma.article.findMany({
    where: { body: null },
    select: { slug: true },
  });
  if (missing.length > 0) {
    console.error(
      "Articles still missing a body:",
      missing.map((m) => m.slug).join(", "),
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("Backfill complete — all articles have a body.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

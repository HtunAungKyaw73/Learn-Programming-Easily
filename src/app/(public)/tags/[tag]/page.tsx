import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTags, getArticlesByTag } from "@/lib/mdx";
import { ArticleCard } from "@/components/site/ArticleCard";

type Params = { tag: string };

export function generateStaticParams(): Params[] {
  return getAllTags().map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `#${decodeURIComponent(tag)}`,
    description: `Articles tagged #${decodeURIComponent(tag)}.`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const articles = getArticlesByTag(decoded);

  if (articles.length === 0) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        #{decoded}
      </h1>
      <p className="mt-2 text-muted">
        {articles.length} article{articles.length === 1 ? "" : "s"}.
      </p>
      <div className="mt-6">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}

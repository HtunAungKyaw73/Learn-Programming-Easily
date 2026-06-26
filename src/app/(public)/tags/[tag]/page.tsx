import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicArticlesByTag, getPublicTagsWithCount } from "@/lib/queries";
import { ArticleCard } from "@/components/site/ArticleCard";
import { Container } from "@/components/site/Container";

type Params = { tag: string };

export async function generateStaticParams(): Promise<Params[]> {
  const tags = await getPublicTagsWithCount();
  return tags.filter((t) => t.count > 0).map((t) => ({ tag: t.name }));
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
  const articles = await getPublicArticlesByTag(decoded);

  if (articles.length === 0) notFound();

  return (
    <Container>
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
    </Container>
  );
}

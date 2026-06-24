import type { Metadata } from "next";
import { getPublicArticles } from "@/lib/queries";
import { ArticleCard } from "@/components/site/ArticleCard";

export const metadata: Metadata = {
  title: "Articles",
  description: "All articles, newest first.",
};

export default async function ArticlesPage() {
  const articles = await getPublicArticles();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Articles
      </h1>
      <p className="mt-2 text-muted">
        {articles.length} article{articles.length === 1 ? "" : "s"}, newest
        first.
      </p>
      <div className="mt-6">
        {articles.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-xl font-semibold text-ink">
              No articles yet
            </p>
            <p className="mt-2 font-prose text-muted">Check back soon.</p>
          </div>
        ) : (
          articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </div>
    </div>
  );
}

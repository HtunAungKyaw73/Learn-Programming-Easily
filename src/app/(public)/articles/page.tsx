import type { Metadata } from "next";
import { getAllArticles } from "@/lib/mdx";
import { ArticleCard } from "@/components/site/ArticleCard";

export const metadata: Metadata = {
  title: "Articles",
  description: "All articles, newest first.",
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Articles
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {articles.length} article{articles.length === 1 ? "" : "s"}, newest
        first.
      </p>
      <div className="mt-6">
        {articles.length === 0 ? (
          <p className="py-16 text-center text-zinc-500 dark:text-zinc-400">
            No articles yet.
          </p>
        ) : (
          articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </div>
    </div>
  );
}

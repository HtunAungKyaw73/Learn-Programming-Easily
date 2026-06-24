import { getAllArticles } from "@/lib/mdx";
import { ArticleCard } from "@/components/site/ArticleCard";
import { site } from "@/lib/site";

export default function HomePage() {
  const articles = getAllArticles();

  return (
    <div>
      <section className="border-b border-zinc-200/70 pb-12 dark:border-zinc-800/70">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {site.name}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {site.description}
        </p>
      </section>

      <section className="mt-4">
        {articles.length === 0 ? (
          <p className="py-16 text-center text-zinc-500 dark:text-zinc-400">
            No articles yet. Check back soon.
          </p>
        ) : (
          articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </section>
    </div>
  );
}

import { getAllArticles } from "@/lib/mdx";
import { ArticleCard } from "@/components/site/ArticleCard";
import { site } from "@/lib/site";

export default function HomePage() {
  const articles = getAllArticles();

  return (
    <div>
      <section className="border-b border-border pb-12">
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          {site.name}
        </h1>
        <p className="mt-5 max-w-xl font-prose text-xl leading-relaxed text-muted">
          {site.description}
        </p>
      </section>

      <section className="mt-4">
        {articles.length === 0 ? (
          <p className="py-16 text-center text-faint">
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

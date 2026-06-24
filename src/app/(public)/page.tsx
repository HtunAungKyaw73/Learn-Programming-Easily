import { getPublicArticles } from "@/lib/queries";
import { ArticleCard } from "@/components/site/ArticleCard";
import { site } from "@/lib/site";

export default async function HomePage() {
  const articles = await getPublicArticles();

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
      </section>
    </div>
  );
}

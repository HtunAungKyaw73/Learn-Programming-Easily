import Link from "next/link";
import { getArticleStats, getAdminArticles } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export default async function AdminDashboard() {
  const stats = await getArticleStats();
  const recent = (await getAdminArticles()).slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <Link
          href="/admin/articles/new"
          className="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong"
        >
          New Article
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Drafts", value: stats.drafts },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <p className="text-sm text-faint">{card.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent articles */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">
          Recent Articles
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-faint">
            No articles yet.{" "}
            <Link
              href="/admin/articles/new"
              className="text-terracotta hover:underline"
            >
              Create one
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recent.map((article) => (
              <li
                key={article.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      article.published ? "bg-green-500" : "bg-zinc-400"
                    }`}
                    title={article.published ? "Published" : "Draft"}
                  />
                  <Link
                    href={`/admin/articles/${article.slug}/edit`}
                    className="text-sm font-medium text-ink transition-colors hover:text-terracotta"
                  >
                    {article.title}
                  </Link>
                </div>
                <span className="text-xs text-faint">
                  {formatDate(article.createdAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

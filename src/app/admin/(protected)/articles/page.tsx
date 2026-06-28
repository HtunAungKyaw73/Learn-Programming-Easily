import Link from "next/link";
import { getAdminArticles } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteArticle } from "@/lib/actions/article";

export default async function AdminArticlesPage() {
  const articles = await getAdminArticles("all");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Articles
        </h1>
        <Link
          href="/admin/articles/new"
          className="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong"
        >
          New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="mt-8 text-center text-faint">
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
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-faint">
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Title</th>
                <th className="hidden pb-2 pr-4 font-medium sm:table-cell">
                  Tags
                </th>
                <th className="hidden pb-2 pr-4 font-medium md:table-cell">
                  Date
                </th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {articles.map((article) => (
                <tr key={article.id} className="group">
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        article.published ? "bg-green-500" : "bg-zinc-400"
                      }`}
                      title={article.published ? "Published" : "Draft"}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/articles/${article.slug}/edit`}
                      className="font-medium text-ink transition-colors hover:text-terracotta"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="hidden py-3 pr-4 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {article.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs text-terracotta"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="hidden py-3 pr-4 text-faint md:table-cell">
                    {article.publishedAt
                      ? formatDate(article.publishedAt.toISOString())
                      : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <a
                        href={`/admin/articles/${article.slug}/download`}
                        download
                        aria-label="Download Markdown"
                        title="Download Markdown"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M7 10l5 5 5-5" />
                          <path d="M12 15V3" />
                        </svg>
                      </a>
                      <a
                        href={`/articles/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on site"
                        title="View on site"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </a>
                      <Link
                        href={`/admin/articles/${article.slug}/edit`}
                        aria-label="Edit"
                        title="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Link>
                      <DeleteButton
                        icon
                        itemName={article.title}
                        action={async () => {
                          "use server";
                          await deleteArticle(article.slug);
                        }}
                        label="Delete"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { getAdminArticleBySlug } from "@/lib/queries";
import { ArticleForm } from "@/components/admin/ArticleForm";

type Params = { slug: string };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getAdminArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Edit Article
        </h1>
        <a
          href={`/admin/articles/${slug}/download`}
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
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
          Download .md
        </a>
      </div>
      <p className="mt-1 text-sm text-faint">
        Editing &ldquo;{article.title}&rdquo;. Changes update both the MDX file
        and the database.
      </p>
      <div className="mt-6">
        <ArticleForm mode="edit" initialData={article} />
      </div>
    </div>
  );
}

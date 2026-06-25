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
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Edit Article
      </h1>
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

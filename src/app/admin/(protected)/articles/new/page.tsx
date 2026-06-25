import { ArticleForm } from "@/components/admin/ArticleForm";

export default function NewArticlePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        New Article
      </h1>
      <p className="mt-1 text-sm text-faint">
        Create a new article. The MDX file and database record will be created
        together.
      </p>
      <div className="mt-6">
        <ArticleForm mode="create" />
      </div>
    </div>
  );
}

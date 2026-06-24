import { getAdminCategories } from "@/lib/queries";
import { CategoryManager } from "./category-manager";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Categories
      </h1>
      <p className="mt-1 text-sm text-faint">
        Manage categories for organizing articles.
      </p>
      <div className="mt-6">
        <CategoryManager initialCategories={categories} />
      </div>
    </div>
  );
}

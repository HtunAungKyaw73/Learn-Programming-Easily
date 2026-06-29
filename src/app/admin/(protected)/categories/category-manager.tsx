"use client";

import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/category";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import type { AdminTagItem } from "@/types";

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: AdminTagItem[];
}) {
  return (
    <TaxonomyManager
      initialItems={initialCategories}
      noun="category"
      nounPlural="categories"
      onCreate={createCategory}
      onUpdate={updateCategory}
      onDelete={deleteCategory}
    />
  );
}

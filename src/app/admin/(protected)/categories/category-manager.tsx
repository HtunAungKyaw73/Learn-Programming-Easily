"use client";

import { useState } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/category";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TaxonomyFormDialog } from "@/components/admin/TaxonomyFormDialog";
import type { AdminTagItem } from "@/types";

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: AdminTagItem[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState("");

  async function handleDelete(id: number) {
    setError("");
    const result = await deleteCategory(id);
    if (result.ok) {
      setCategories(categories.filter((c) => c.id !== id));
    } else {
      setError(result.error);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-faint">
          {categories.length} categor
          {categories.length === 1 ? "y" : "ies"}
        </p>
        <TaxonomyFormDialog
          title="New category"
          submitLabel="Add"
          placeholder="Category name"
          onSubmit={async (name) => {
            const res = await createCategory(name);
            if (res.ok) window.location.reload();
            return res;
          }}
          trigger={
            <button
              type="button"
              className="cursor-pointer rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong dark:text-paper"
            >
              + New Category
            </button>
          }
        />
      </div>

      <ul className="mt-4 divide-y divide-border">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">{cat.name}</span>
              <span className="text-xs text-faint">
                {cat._count.articles} article
                {cat._count.articles === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TaxonomyFormDialog
                title="Edit category"
                submitLabel="Save"
                placeholder="Category name"
                initialValue={cat.name}
                onSubmit={async (name) => {
                  const res = await updateCategory(cat.id, name);
                  if (res.ok) window.location.reload();
                  return res;
                }}
                trigger={
                  <button
                    type="button"
                    aria-label="Edit"
                    title="Edit"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-terracotta"
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
                  </button>
                }
              />
              <DeleteButton
                icon
                itemName={cat.name}
                action={() => handleDelete(cat.id)}
                label="Delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

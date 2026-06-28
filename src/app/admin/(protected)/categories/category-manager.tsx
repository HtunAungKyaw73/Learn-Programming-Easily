"use client";

import { useState, type KeyboardEvent } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/category";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { AdminTagItem } from "@/types";

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: AdminTagItem[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    const result = await createCategory(newName);
    if (result.ok) {
      setNewName("");
      setCreating(false);
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  async function handleUpdate(id: number) {
    setError("");
    const result = await updateCategory(id, editName);
    if (result.ok) {
      setEditId(null);
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

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
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong"
          >
            + New Category
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            placeholder="Category name"
            autoFocus
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-terracotta"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-terracotta px-3 py-2 text-sm text-white hover:bg-terracotta-strong"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-border">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between py-3">
            {editId === cat.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleUpdate(cat.id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  autoFocus
                  className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-terracotta"
                />
                <button
                  type="button"
                  onClick={() => handleUpdate(cat.id)}
                  className="text-sm text-terracotta hover:underline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="text-sm text-faint hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink">
                    {cat.name}
                  </span>
                  <span className="text-xs text-faint">
                    {cat._count.articles} article
                    {cat._count.articles === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(cat.id);
                      setEditName(cat.name);
                    }}
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
                  <DeleteButton
                    icon
                    itemName={cat.name}
                    action={() => handleDelete(cat.id)}
                    label="Delete"
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

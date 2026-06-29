"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  TaxonomyFormDialog,
  type TaxonomyFormResult,
} from "@/components/admin/TaxonomyFormDialog";
import type { AdminTagItem } from "@/types";

interface TaxonomyManagerProps {
  initialItems: AdminTagItem[];
  /** Singular noun, lowercase — e.g. "tag", "category". */
  noun: string;
  /** Plural noun — e.g. "tags", "categories" (irregular, so passed explicitly). */
  nounPlural: string;
  /** Prefix shown before each name, e.g. "#" for tags. */
  prefix?: string;
  onCreate: (name: string) => Promise<TaxonomyFormResult>;
  onUpdate: (id: number, name: string) => Promise<TaxonomyFormResult>;
  onDelete: (id: number) => Promise<TaxonomyFormResult>;
}

export function TaxonomyManager({
  initialItems,
  noun,
  nounPlural,
  prefix = "",
  onCreate,
  onUpdate,
  onDelete,
}: TaxonomyManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");

  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  async function handleDelete(id: number) {
    setError("");
    const result = await onDelete(id);
    if (result.ok) {
      setItems(items.filter((i) => i.id !== id));
    } else {
      setError(result.error ?? "Something went wrong.");
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
          {items.length} {items.length === 1 ? noun : nounPlural}
        </p>
        <TaxonomyFormDialog
          title={`New ${noun}`}
          submitLabel="Add"
          placeholder={`${Noun} name`}
          onSubmit={async (name) => {
            const res = await onCreate(name);
            if (res.ok) window.location.reload();
            return res;
          }}
          trigger={
            <button
              type="button"
              className="cursor-pointer rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong dark:text-paper"
            >
              + New {Noun}
            </button>
          }
        />
      </div>

      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">
                {prefix}
                {item.name}
              </span>
              <span className="text-xs text-faint">
                {item._count.articles} article
                {item._count.articles === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TaxonomyFormDialog
                title={`Edit ${noun}`}
                submitLabel="Save"
                placeholder={`${Noun} name`}
                initialValue={item.name}
                onSubmit={async (name) => {
                  const res = await onUpdate(item.id, name);
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
                itemName={`${prefix}${item.name}`}
                action={() => handleDelete(item.id)}
                label="Delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

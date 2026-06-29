"use client";

import { useState } from "react";
import { createTag, updateTag, deleteTag } from "@/lib/actions/tag";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TaxonomyFormDialog } from "@/components/admin/TaxonomyFormDialog";
import type { AdminTagItem } from "@/types";

export function TagManager({ initialTags }: { initialTags: AdminTagItem[] }) {
  const [tags, setTags] = useState(initialTags);
  const [error, setError] = useState("");

  async function handleDelete(id: number) {
    setError("");
    const result = await deleteTag(id);
    if (result.ok) {
      setTags(tags.filter((t) => t.id !== id));
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
          {tags.length} tag{tags.length === 1 ? "" : "s"}
        </p>
        <TaxonomyFormDialog
          title="New tag"
          submitLabel="Add"
          placeholder="Tag name"
          onSubmit={async (name) => {
            const res = await createTag(name);
            if (res.ok) window.location.reload();
            return res;
          }}
          trigger={
            <button
              type="button"
              className="cursor-pointer rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong dark:text-paper"
            >
              + New Tag
            </button>
          }
        />
      </div>

      <ul className="mt-4 divide-y divide-border">
        {tags.map((tag) => (
          <li key={tag.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">#{tag.name}</span>
              <span className="text-xs text-faint">
                {tag._count.articles} article
                {tag._count.articles === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TaxonomyFormDialog
                title="Edit tag"
                submitLabel="Save"
                placeholder="Tag name"
                initialValue={tag.name}
                onSubmit={async (name) => {
                  const res = await updateTag(tag.id, name);
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
                itemName={`#${tag.name}`}
                action={() => handleDelete(tag.id)}
                label="Delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

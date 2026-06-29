"use client";

import { createTag, updateTag, deleteTag } from "@/lib/actions/tag";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import type { AdminTagItem } from "@/types";

export function TagManager({ initialTags }: { initialTags: AdminTagItem[] }) {
  return (
    <TaxonomyManager
      initialItems={initialTags}
      noun="tag"
      nounPlural="tags"
      prefix="#"
      onCreate={createTag}
      onUpdate={updateTag}
      onDelete={deleteTag}
    />
  );
}

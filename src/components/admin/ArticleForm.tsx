"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TagInput } from "./TagInput";
import { Mdx } from "@/components/mdx/Mdx";
import { slugify } from "@/lib/slug";
import { createArticle, updateArticle } from "@/lib/actions/article";
import { renderMdxPreview } from "@/lib/actions/preview";
import type { ArticleWithContent } from "@/types";

interface ArticleFormProps {
  mode: "create" | "edit";
  initialData?: ArticleWithContent;
}

export function ArticleForm({ mode, initialData }: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [tags, setTags] = useState<string[]>(
    initialData?.tags.map((t) => t.name) ?? [],
  );
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories.map((c) => c.name) ?? [],
  );
  const [published, setPublished] = useState(initialData?.published ?? false);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt
      ? new Date(initialData.publishedAt).toISOString().split("T")[0]
      : "",
  );
  const [content, setContent] = useState(initialData?.content ?? "");

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewBody, setPreviewBody] = useState("");
  const [previewError, setPreviewError] = useState("");

  // Error state
  const [error, setError] = useState("");

  // Debounced preview
  useEffect(() => {
    if (!showPreview) return;
    const timer = setTimeout(async () => {
      const result = await renderMdxPreview(content);
      if (result.ok) {
        setPreviewBody(result.body);
        setPreviewError("");
      } else {
        setPreviewError(result.error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [content, showPreview]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const formData = {
        title,
        slug,
        description,
        content,
        published,
        featured,
        publishedAt,
        coverImage,
        tagNames: tags,
        categoryNames: categories,
      };

      startTransition(async () => {
        const result =
          mode === "create"
            ? await createArticle(formData)
            : await updateArticle(initialData!.slug, formData);

        if (result.ok) {
          router.push("/admin/articles");
        } else {
          setError(result.error);
        }
      });
    },
    [
      title,
      slug,
      description,
      content,
      published,
      featured,
      publishedAt,
      coverImage,
      tags,
      categories,
      mode,
      initialData,
      router,
    ],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left pane: form fields */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                // Derive the slug live while creating, until the user edits it.
                if (mode === "create" && !slugEdited) setSlug(slugify(next));
              }}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-terracotta"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Slug
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              readOnly={mode === "edit"}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-terracotta read-only:bg-paper read-only:text-faint"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-terracotta"
            />
          </div>

          <div>
            <label
              htmlFor="coverImage"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Cover Image URL
            </label>
            <input
              id="coverImage"
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-terracotta"
            />
          </div>

          <TagInput value={tags} onChange={setTags} label="Tags" />
          <TagInput
            value={categories}
            onChange={setCategories}
            label="Categories"
            placeholder="Add category…"
          />

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-terracotta"
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-terracotta"
              />
              Featured
            </label>
          </div>

          <div>
            <label
              htmlFor="publishedAt"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Published At
            </label>
            <input
              id="publishedAt"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-terracotta"
            />
          </div>
        </div>

        {/* Right pane: content + preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="content"
              className="text-sm font-medium text-ink"
            >
              Content (MDX)
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {showPreview ? (
            <div className="min-h-[400px] rounded-md border border-border bg-surface p-6">
              {previewError ? (
                <p className="text-sm text-red-600">{previewError}</p>
              ) : previewBody ? (
                <Mdx source={previewBody} />
              ) : (
                <p className="text-sm text-faint">Nothing to preview.</p>
              )}
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="Write your MDX content here…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-terracotta"
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-terracotta px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong disabled:opacity-50"
        >
          {isPending
            ? "Saving…"
            : mode === "create"
              ? "Create Article"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/articles")}
          className="rounded-md border border-border px-5 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

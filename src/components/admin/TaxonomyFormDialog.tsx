"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";

export interface TaxonomyFormResult {
  ok: boolean;
  error?: string;
}

interface TaxonomyFormDialogProps {
  /** Element that opens the dialog (e.g. the "New" button or a row's edit icon). */
  trigger: React.ReactNode;
  title: string;
  description?: string;
  submitLabel: string;
  initialValue?: string;
  placeholder?: string;
  /** Runs on submit; return `{ ok }` to close, or `{ ok: false, error }` to show inline. */
  onSubmit: (name: string) => Promise<TaxonomyFormResult>;
}

export function TaxonomyFormDialog({
  trigger,
  title,
  description,
  submitLabel,
  initialValue = "",
  placeholder,
  onSubmit,
}: TaxonomyFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(next: boolean) {
    if (pending) return; // don't allow closing mid-submit
    if (next) {
      setName(initialValue);
      setError("");
    }
    setOpen(next);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setPending(true);
    setError("");
    const res = await onSubmit(trimmed);
    setPending(false);
    if (res.ok) setOpen(false);
    else setError(res.error ?? "Something went wrong.");
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fade-in fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="font-display text-lg font-semibold text-ink">
            {title}
          </Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-muted">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-4"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              aria-label={title}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-terracotta"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-terracotta-strong">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={pending}
                  className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong disabled:cursor-not-allowed disabled:opacity-60 dark:text-paper"
              >
                {pending && (
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {pending ? "Saving…" : submitLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

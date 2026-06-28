"use client";

import { useState } from "react";
import { AlertDialog } from "radix-ui";

interface DeleteButtonProps {
  action: () => Promise<void>;
  /** Verb shown on the trigger and confirm button (default "Delete"). */
  label?: string;
  /** Name of the thing being deleted, shown in the confirmation message. */
  itemName?: string;
  /** Render the trigger as a compact icon button instead of a text button. */
  icon?: boolean;
}

export function DeleteButton({
  action,
  label = "Delete",
  itemName,
  icon = false,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await action();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const trigger = icon ? (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
    </button>
  ) : (
    <button
      type="button"
      className="cursor-pointer text-sm text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
    >
      {label}
    </button>
  );

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        // Don't allow Esc / backdrop to close mid-delete.
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content className="fade-in fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl focus:outline-none">
          <AlertDialog.Title className="font-display text-lg font-semibold text-ink">
            {label}
            {itemName ? ` “${itemName}”` : ""}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">
            This action can’t be undone.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={pending}
                className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-500"
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
              {pending ? "Deleting…" : label}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

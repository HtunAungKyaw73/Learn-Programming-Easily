"use client";

import { useState } from "react";

interface DeleteButtonProps {
  action: () => Promise<void>;
  label?: string;
  /** Render as a compact icon button instead of a text button. */
  icon?: boolean;
}

export function DeleteButton({
  action,
  label = "Delete",
  icon = false,
}: DeleteButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Are you sure you want to ${label.toLowerCase()}?`))
      return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  if (icon) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={label}
        title={label}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-500/10 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
      >
        {pending ? (
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
        ) : (
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
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="cursor-pointer text-sm text-red-600 transition-colors hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

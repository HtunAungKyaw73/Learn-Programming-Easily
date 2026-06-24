"use client";

import { useState } from "react";

interface DeleteButtonProps {
  action: () => Promise<void>;
  label?: string;
}

export function DeleteButton({ action, label = "Delete" }: DeleteButtonProps) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-600 transition-colors hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

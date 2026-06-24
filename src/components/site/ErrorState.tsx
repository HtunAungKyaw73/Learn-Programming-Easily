"use client";

export function ErrorState({
  title = "Something went wrong.",
  reset,
}: {
  title?: string;
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-sm font-prose text-lg text-muted">
        An unexpected error occurred. Please try again.
      </p>
      {reset && (
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta-strong"
        >
          Try again
        </button>
      )}
    </div>
  );
}

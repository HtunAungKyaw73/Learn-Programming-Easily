"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createFuse, searchDocs, type SearchDoc } from "@/lib/search";

export function Search({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => createFuse(docs), [docs]);
  const results = useMemo(
    () => searchDocs(fuse, query).slice(0, 8),
    [fuse, query],
  );

  // ⌘K / Ctrl-K toggles; Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while open; reset query on close.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    setQuery("");
  }, [open]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/articles/${slug}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
        aria-label="Search"
      >
        <span>Search</span>
        <kbd className="hidden rounded bg-zinc-100 px-1.5 font-mono text-xs text-zinc-500 sm:inline dark:bg-zinc-800">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[0]) go(results[0].slug);
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full border-b border-zinc-200 bg-transparent px-4 py-3.5 text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:text-zinc-100"
              />
            </form>
            <ul className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No matches
                </li>
              )}
              {results.map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                      {doc.title}
                    </span>
                    {doc.description && (
                      <span className="mt-0.5 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {doc.description}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

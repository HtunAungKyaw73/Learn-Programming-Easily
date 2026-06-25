"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFuse,
  searchDocs,
  nextActiveIndex,
  type SearchDoc,
} from "@/lib/search";

export function Search({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
        setQuery("");
        setActive(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while open; return focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  function openSearch() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function go(slug: string) {
    setOpen(false);
    router.push(`/articles/${slug}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) =>
        nextActiveIndex(
          a,
          e.key as "ArrowUp" | "ArrowDown",
          results.length,
        ),
      );
    }
  }

  // Focus trap: keep Tab within the panel.
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openSearch}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
        aria-label="Search"
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
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-surface px-1.5 font-mono text-xs text-faint sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search articles"
            onKeyDown={onPanelKeyDown}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[active]) go(results[active].slug);
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                aria-label="Search articles"
                placeholder="Search articles…"
                className="w-full border-b border-border bg-transparent px-4 py-3.5 text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              />
            </form>
            <ul className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-faint">
                  No matches
                </li>
              )}
              {results.map((doc, i) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    onMouseEnter={() => setActive(i)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      i === active ? "bg-paper" : "hover:bg-paper"
                    }`}
                  >
                    <span className="block font-medium text-ink">
                      {doc.title}
                    </span>
                    {doc.description && (
                      <span className="mt-0.5 block truncate text-sm text-muted">
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

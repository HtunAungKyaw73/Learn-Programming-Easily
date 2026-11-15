"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { shouldRefreshOnFocus } from "@/lib/refresh-on-focus";

/**
 * Re-fetches the current route when the tab regains attention.
 *
 * `revalidatePath` refreshes the server cache, but a tab that is already open
 * has no way to hear about it: the rendered page, the prefetched routes, and
 * the layout (which holds the search index) all stay as they were until a full
 * reload. So an article deleted in the admin tab kept showing in the public
 * tab. `router.refresh()` drops that client cache and re-renders the route,
 * layout included, without losing scroll position or client state.
 *
 * Renders nothing.
 */
export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    // The page is fresh as of mount, so the first gap is measured from here.
    let lastRefreshAt = Date.now();

    function onAttention() {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      if (!shouldRefreshOnFocus({ visible, now, lastRefreshAt })) return;
      lastRefreshAt = now;
      router.refresh();
    }

    // `visibilitychange` covers switching tabs; `focus` covers switching
    // between two windows that are both visible. The throttle dedupes them.
    document.addEventListener("visibilitychange", onAttention);
    window.addEventListener("focus", onAttention);
    return () => {
      document.removeEventListener("visibilitychange", onAttention);
      window.removeEventListener("focus", onAttention);
    };
  }, [router]);

  return null;
}

// Pure decision for <RefreshOnFocus>: no DOM or router access here, so the
// throttle is unit-testable without a browser.

/**
 * Shortest gap between two focus-triggered refreshes. One tab switch fires both
 * `visibilitychange` and `focus`, and readers alt-tab; this caps the cost at
 * one request per gap while staying short enough that an edit made in another
 * tab shows up as soon as the reader comes back.
 */
export const REFRESH_MIN_INTERVAL_MS = 5_000;

/** Whether a tab that just regained attention should re-fetch its route. */
export function shouldRefreshOnFocus(opts: {
  /** `document.visibilityState === "visible"`. */
  visible: boolean;
  /** Current time, ms since epoch. */
  now: number;
  /** When the page was loaded or last refreshed, ms since epoch. */
  lastRefreshAt: number;
  minIntervalMs?: number;
}): boolean {
  const { visible, now, lastRefreshAt, minIntervalMs = REFRESH_MIN_INTERVAL_MS } = opts;
  if (!visible) return false;
  return now - lastRefreshAt >= minIntervalMs;
}

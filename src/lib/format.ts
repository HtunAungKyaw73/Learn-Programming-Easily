/**
 * Format an ISO date string (e.g. "2026-06-24") as a human-readable date.
 * Returns an empty string for missing/invalid input so callers can render
 * unconditionally.
 */
export function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

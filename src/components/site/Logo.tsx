import { site } from "@/lib/site";

/**
 * Brand logo: a terracotta monogram mark plus an optional serif wordmark.
 * The mark uses `currentColor`, so it adapts to whatever text color wraps it.
 */
export function Logo({
  className = "",
  showWordmark = true,
  wordmarkClassName = "",
  label = site.name,
}: {
  className?: string;
  showWordmark?: boolean;
  /** Extra classes for the wordmark span, e.g. `hidden sm:inline` to hide it on mobile. */
  wordmarkClassName?: string;
  label?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-7 w-7 flex-shrink-0 text-terracotta" />
      {showWordmark && (
        <span
          className={`font-display text-base font-semibold tracking-tight text-ink sm:text-lg ${wordmarkClassName}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${site.name} logo`}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* L */}
      <path d="M10 12h8v2h-6v12h-2V12z" fill="currentColor" />
      {/* P */}
      <path
        d="M20 12h6c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-6V12zm2 2v8h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2h-4z"
        fill="currentColor"
      />
      {/* E — stacked bars */}
      <path d="M10 30h8v2h-8v-2zm10 0h8v2h-8v-2z" fill="currentColor" />
    </svg>
  );
}

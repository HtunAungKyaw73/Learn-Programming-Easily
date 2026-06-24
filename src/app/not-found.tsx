import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-tight text-ink"
      >
        {site.name}
      </Link>
      <p className="mt-10 font-display text-6xl font-semibold tracking-tight text-terracotta">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm font-prose text-lg text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-terracotta hover:text-terracotta"
      >
        &larr; Back home
      </Link>
    </div>
  );
}

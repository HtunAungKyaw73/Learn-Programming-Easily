import Link from "next/link";
import { site } from "@/lib/site";
import { Search } from "@/components/search/Search";
import { getSearchDocs } from "@/lib/search-index";

export function Header() {
  const docs = getSearchDocs();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          {site.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <Search docs={docs} />
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

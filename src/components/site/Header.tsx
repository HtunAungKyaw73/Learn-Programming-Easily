import Link from "next/link";
import { site } from "@/lib/site";
import { Search } from "@/components/search/Search";
import { getSearchDocs } from "@/lib/search-index";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export async function Header() {
  const docs = await getSearchDocs();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg"
        >
          <span className="sm:hidden">{site.shortName}</span>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <Search docs={docs} />
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-terracotta"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

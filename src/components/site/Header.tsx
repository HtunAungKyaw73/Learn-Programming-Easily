import Link from "next/link";
import { site } from "@/lib/site";
import { Search } from "@/components/search/Search";
import { getSearchDocs } from "@/lib/search-index";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Container } from "@/components/site/Container";
import { Logo } from "@/components/site/Logo";

export async function Header() {
  const docs = await getSearchDocs();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${site.name} — home`}>
          <Logo wordmarkClassName="hidden sm:inline" />
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
      </Container>
    </header>
  );
}

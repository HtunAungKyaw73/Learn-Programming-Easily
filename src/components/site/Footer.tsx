import { site } from "@/lib/site";
import { Container } from "@/components/site/Container";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-2 py-10 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.author.name}
        </p>
        <div className="flex items-center gap-4">
          <a href="/rss.xml" className="transition-colors hover:text-terracotta">
            RSS
          </a>
        </div>
      </Container>
    </footer>
  );
}

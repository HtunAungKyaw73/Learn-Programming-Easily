import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-10 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.author}
        </p>
        <div className="flex items-center gap-4">
          <a href="/rss.xml" className="transition-colors hover:text-terracotta">
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}

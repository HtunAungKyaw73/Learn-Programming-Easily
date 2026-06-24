import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-zinc-200/70 dark:border-zinc-800/70">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-10 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-400">
        <p>
          © {new Date().getFullYear()} {site.author}
        </p>
        <div className="flex items-center gap-4">
          <a href="/rss.xml" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}

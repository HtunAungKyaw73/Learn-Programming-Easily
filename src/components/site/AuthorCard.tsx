import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { SocialLinks } from "@/components/site/SocialLinks";

export function AuthorCard({
  variant = "article",
  className = "",
}: {
  variant?: "article" | "home";
  className?: string;
}) {
  const { author } = site;

  if (variant === "home") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <Image
          src={author.avatar}
          alt={author.name}
          width={56}
          height={56}
          className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">
            {author.name}
          </p>
          <p className="mt-0.5 text-sm text-muted">{author.bioShort}</p>
          <SocialLinks socials={author.socials} className="mt-1.5 -ml-2" />
        </div>
      </div>
    );
  }

  return (
    <aside className="mt-12 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-start">
      <Image
        src={author.avatar}
        alt={author.name}
        width={64}
        height={64}
        className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint">
          Written by
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ink">
          {author.name}
        </p>
        <p className="mt-1 text-sm text-muted">{author.bioShort}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <SocialLinks socials={author.socials} className="-ml-2" />
          <Link
            href="/about"
            className="text-sm text-terracotta transition-colors hover:underline"
          >
            More about me →
          </Link>
        </div>
      </div>
    </aside>
  );
}

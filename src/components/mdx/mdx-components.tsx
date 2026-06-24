import Link from "next/link";
import type { MDXComponents } from "mdx/types";

/**
 * Custom element overrides for rendered MDX. Most prose styling comes from the
 * Tailwind Typography `prose` wrapper; these handle behavior the plugin can't,
 * like client-side navigation for internal links.
 */
export const mdxComponents: MDXComponents = {
  a: ({ href = "", children, ...props }) => {
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

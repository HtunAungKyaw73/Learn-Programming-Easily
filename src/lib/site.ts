/**
 * Static site-wide configuration. Single source of truth for branding and
 * canonical URL, used by metadata, the RSS feed, and page chrome.
 */
export const site = {
  name: "Learn Programming Easily",
  shortName: "LPE",
  description:
    "Practical programming articles on web development, JavaScript, TypeScript, React, and system design — written to make hard ideas easy.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  author: "Htun Aung Kyaw",
  nav: [
    { label: "Articles", href: "/articles" },
    { label: "Tags", href: "/tags" },
  ],
} as const;

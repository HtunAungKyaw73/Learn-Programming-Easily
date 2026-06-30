/**
 * Static site-wide configuration. Single source of truth for branding and
 * canonical URL, used by metadata, the RSS feed, and page chrome.
 */
import { skills } from "@/lib/skills";

export type SocialPlatform =
  | "github"
  | "linkedin"
  | "email"
  | "twitter"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  href: string;
}

export interface Skill {
  name: string;
  /** Single SVG path string, drawn in a `0 0 24 24` viewBox. */
  iconPath: string;
  /** Official brand hex (e.g. "#61DAFB"), or "var(--ink)" for brand-black logos. */
  brandColor: string;
}

export interface SkillCategory {
  label: string;
  skills: Skill[];
}

export interface Author {
  name: string;
  tagline?: string;
  bioShort: string;
  bioLong: string;
  avatar: string;
  socials: SocialLink[];
  skills: SkillCategory[];
}

const author: Author = {
  name: "Htun Aung Kyaw",
  bioShort:
    "Full-stack developer who turns complex problems into simple, intuitive designs.",
  bioLong:
    "I'm a developer with a strong foundation in both front-end and back-end technologies. I enjoy turning complex problems into simple, beautiful, and intuitive designs. I love to learn new things and am always looking to expand my skillset.",
  avatar: "/author.jpg",
  socials: [
    { platform: "github", href: "https://github.com/HtunAungKyaw73" },
    {
      platform: "linkedin",
      href: "https://www.linkedin.com/in/htun-aung-kyaw-385285352/",
    },
    { platform: "website", href: "https://portfolio.htunaungkyaw.online/" },
    { platform: "email", href: "mailto:htunaungkyaw730@gmail.com" },
  ],
  skills,
};

export const site = {
  name: "Learn Programming Easily",
  shortName: "LPE",
  description:
    "Practical programming articles on web development, JavaScript, TypeScript, React, and system design — written to make hard ideas easy.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  author,
  nav: [
    { label: "Articles", href: "/articles" },
    { label: "Tags", href: "/tags" },
    { label: "About", href: "/about" },
  ],
} as const;

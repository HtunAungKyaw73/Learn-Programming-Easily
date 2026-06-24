"use client";

import dynamic from "next/dynamic";

const ThemeToggleButton = dynamic(() => import("./ThemeToggleButton"), {
  ssr: false,
  loading: () => <span className="inline-block h-8 w-8" aria-hidden />,
});

export function ThemeToggle() {
  return <ThemeToggleButton />;
}

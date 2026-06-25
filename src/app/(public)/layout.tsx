import { ViewTransition } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:outline-2 focus:outline-terracotta"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        className="fade-in mx-auto w-full max-w-3xl flex-1 px-6 py-12"
      >
        <ViewTransition>{children}</ViewTransition>
      </main>
      <Footer />
    </>
  );
}

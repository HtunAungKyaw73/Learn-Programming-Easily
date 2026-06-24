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
      <Header />
      <main className="fade-in mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <ViewTransition>{children}</ViewTransition>
      </main>
      <Footer />
    </>
  );
}

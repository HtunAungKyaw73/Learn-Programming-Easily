import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/site/Container";
import { SocialLinks } from "@/components/site/SocialLinks";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: site.author.bioShort,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const { author } = site;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    description: author.bioShort,
    image: `${site.url}${author.avatar}`,
    url: `${site.url}/about`,
    sameAs: author.socials
      .filter((s) => s.platform !== "email")
      .map((s) => s.href),
  };

  return (
    <Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Image
          src={author.avatar}
          alt={author.name}
          width={120}
          height={120}
          priority
          className="h-28 w-28 flex-shrink-0 rounded-full object-cover"
        />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {author.name}
          </h1>
          <SocialLinks socials={author.socials} className="mt-2 -ml-2" />
        </div>
      </div>
      <div className="mt-8 max-w-2xl font-prose text-lg leading-relaxed text-muted">
        <p>{author.bioLong}</p>
      </div>
    </Container>
  );
}

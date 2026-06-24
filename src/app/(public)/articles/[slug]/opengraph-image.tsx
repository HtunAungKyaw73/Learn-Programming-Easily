import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { loadOgFont } from "@/lib/og-font";

export const runtime = "nodejs";
export const alt = `${site.name} — article`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, categories: { select: { name: true }, take: 1 } },
  });
  const title = article?.title ?? site.name;
  const kicker = article?.categories[0]?.name ?? "Article";
  const font = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbf6ec",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#a23b2c",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            lineHeight: 1.1,
            color: "#2a2017",
            overflow: "hidden",
            fontFamily: font ? "Fraunces" : undefined,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#5e5343" }}>
          {site.name}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Fraunces", data: font, weight: 600 as const, style: "normal" as const }]
        : undefined,
    },
  );
}

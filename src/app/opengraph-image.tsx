import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { loadOgFont } from "@/lib/og-font";

export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const font = await loadOgFont();
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          background: "#fbf6ec",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 80,
            color: "#2a2017",
            fontFamily: font ? "Fraunces" : undefined,
          }}
        >
          {site.name}
        </div>
        <div
          style={{ display: "flex", fontSize: 32, color: "#5e5343", maxWidth: 900 }}
        >
          {site.description}
        </div>
        <div
          style={{ display: "flex", width: 120, height: 8, background: "#a23b2c" }}
        />
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

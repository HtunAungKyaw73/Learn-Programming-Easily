import { buildRssXml } from "@/lib/rss";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(await buildRssXml(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

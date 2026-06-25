import { NextResponse } from "next/server";
import { sweepStaleAttempts } from "@/lib/auth-rate-limit";

// Runs on the Node.js runtime (Prisma) — not edge.
export const runtime = "nodejs";
// Never cache: this is a scheduled mutation, not a cacheable read.
export const dynamic = "force-dynamic";

/**
 * Vercel cron entry point — globally prunes stale `LoginAttempt` rows so
 * rotating-IP brute-force attempts don't accumulate forever. Scheduled in
 * `vercel.json`. When `CRON_SECRET` is set, Vercel sends it as a bearer token
 * and we reject anything else (mirrors Vercel's own cron dispatcher). Unset
 * locally so the route stays runnable in dev.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const removed = await sweepStaleAttempts();
  return NextResponse.json({ removed });
}

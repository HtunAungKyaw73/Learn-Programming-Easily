import { ipAddress } from "@vercel/functions";
import { prisma } from "@/lib/prisma";

// DB-backed brute-force throttle, keyed by client IP. A failed attempt and a
// locked-out attempt both surface to the caller as a rejected login.
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/**
 * Trusted client IP for rate-limit keying.
 *
 * Uses Vercel's `ipAddress()`, which the platform edge derives from the
 * connection (surfaced via `x-real-ip`) — a client cannot spoof it. We
 * deliberately do NOT read the first `x-forwarded-for` entry: that hop is
 * attacker-controlled, so rotating it would mint a fresh throttle bucket on
 * every request. Falls back to a trusted-proxy `x-real-ip`, then `"unknown"`
 * (local dev, where there is no proxy and all attempts share one bucket).
 */
export function getClientIp(request: Request): string {
  const trusted = ipAddress(request);
  if (trusted) return trusted;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Whether this IP may attempt a login right now. */
export async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: { identifier: ip, createdAt: { gte: since } },
  });
  if (count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Record a failed attempt and prune this IP's rows older than the window. */
export async function recordFailure(ip: string): Promise<void> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  await prisma.loginAttempt.create({ data: { identifier: ip } });
  await prisma.loginAttempt.deleteMany({
    where: { identifier: ip, createdAt: { lt: cutoff } },
  });
}

/** Clear an IP's attempts after a successful login. */
export async function recordSuccess(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { identifier: ip } });
}

/**
 * Global prune of stale rows across every identifier. `recordFailure` only
 * prunes the IP it just wrote, so a rotating-IP attacker leaves orphan rows
 * that never age out; a periodic sweep (Vercel cron) reaps them. Returns the
 * number of rows removed.
 */
export async function sweepStaleAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  const { count } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}

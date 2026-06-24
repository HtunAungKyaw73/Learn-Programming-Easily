import { prisma } from "@/lib/prisma";

// DB-backed brute-force throttle, keyed by client IP. A failed attempt and a
// locked-out attempt both surface to the caller as a rejected login.
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** First IP from x-forwarded-for, or "unknown" when no proxy header is present. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  return xff.split(",")[0]?.trim() || "unknown";
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

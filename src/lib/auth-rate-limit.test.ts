import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loginAttempt: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("@vercel/functions", () => ({ ipAddress: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { ipAddress } from "@vercel/functions";
import {
  getClientIp,
  checkRateLimit,
  recordFailure,
  recordSuccess,
  sweepStaleAttempts,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from "@/lib/auth-rate-limit";

const count = vi.mocked(prisma.loginAttempt.count);
const create = vi.mocked(prisma.loginAttempt.create);
const deleteMany = vi.mocked(prisma.loginAttempt.deleteMany);
const ipAddressMock = vi.mocked(ipAddress);

beforeEach(() => {
  count.mockReset();
  create.mockReset();
  deleteMany.mockReset();
  ipAddressMock.mockReset();
});

describe("getClientIp", () => {
  it("uses the Vercel-trusted ipAddress() and ignores a spoofable x-forwarded-for", () => {
    ipAddressMock.mockReturnValue("9.9.9.9");
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "x-real-ip": "8.8.8.8" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
  it("falls back to x-real-ip when ipAddress() is unavailable", () => {
    ipAddressMock.mockReturnValue(undefined);
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "8.8.8.8" },
    });
    expect(getClientIp(req)).toBe("8.8.8.8");
  });
  it("never trusts x-forwarded-for: returns 'unknown' when it is the only header", () => {
    ipAddressMock.mockReturnValue(undefined);
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("unknown");
  });
  it("returns 'unknown' when no trusted source is present (local dev)", () => {
    ipAddressMock.mockReturnValue(undefined);
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows when under the threshold", async () => {
    count.mockResolvedValue(MAX_ATTEMPTS - 1);
    await expect(checkRateLimit("1.1.1.1")).resolves.toEqual({
      allowed: true,
      retryAfterSec: 0,
    });
  });
  it("blocks at or over the threshold", async () => {
    count.mockResolvedValue(MAX_ATTEMPTS);
    await expect(checkRateLimit("1.1.1.1")).resolves.toEqual({
      allowed: false,
      retryAfterSec: Math.ceil(WINDOW_MS / 1000),
    });
  });
  it("counts only attempts within the window for that IP", async () => {
    count.mockResolvedValue(0);
    await checkRateLimit("9.9.9.9");
    const arg = count.mock.calls[0][0] as {
      where: { identifier: string; createdAt: { gte: Date } };
    };
    expect(arg.where.identifier).toBe("9.9.9.9");
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
  });
});

describe("recordFailure", () => {
  it("inserts a row for the IP and prunes its stale rows", async () => {
    create.mockResolvedValue({} as never);
    deleteMany.mockResolvedValue({ count: 0 } as never);
    await recordFailure("2.2.2.2");
    expect(create).toHaveBeenCalledWith({ data: { identifier: "2.2.2.2" } });
    const arg = deleteMany.mock.calls[0][0] as {
      where: { identifier: string; createdAt: { lt: Date } };
    };
    expect(arg.where.identifier).toBe("2.2.2.2");
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
  });
});

describe("recordSuccess", () => {
  it("clears the IP's rows", async () => {
    deleteMany.mockResolvedValue({ count: 3 } as never);
    await recordSuccess("3.3.3.3");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { identifier: "3.3.3.3" },
    });
  });
});

describe("sweepStaleAttempts", () => {
  it("deletes every row older than the window, across all identifiers", async () => {
    deleteMany.mockResolvedValue({ count: 7 } as never);
    const removed = await sweepStaleAttempts();
    expect(removed).toBe(7);
    const arg = deleteMany.mock.calls[0][0] as {
      where: { createdAt: { lt: Date }; identifier?: string };
    };
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
    // Global sweep — must NOT be scoped to a single identifier.
    expect(arg.where).not.toHaveProperty("identifier");
  });
});

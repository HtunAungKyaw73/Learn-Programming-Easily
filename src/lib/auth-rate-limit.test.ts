import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loginAttempt: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getClientIp,
  checkRateLimit,
  recordFailure,
  recordSuccess,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from "@/lib/auth-rate-limit";

const count = vi.mocked(prisma.loginAttempt.count);
const create = vi.mocked(prisma.loginAttempt.create);
const deleteMany = vi.mocked(prisma.loginAttempt.deleteMany);

beforeEach(() => {
  count.mockReset();
  create.mockReset();
  deleteMany.mockReset();
});

describe("getClientIp", () => {
  it("returns the first x-forwarded-for IP", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
  it("returns 'unknown' when the header is absent", () => {
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

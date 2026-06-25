import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth-rate-limit", () => ({ sweepStaleAttempts: vi.fn() }));

import { GET } from "./route";
import { sweepStaleAttempts } from "@/lib/auth-rate-limit";

const sweep = vi.mocked(sweepStaleAttempts);
const ORIGINAL_SECRET = process.env.CRON_SECRET;
const URL = "http://x/api/cron/sweep-login-attempts";

beforeEach(() => {
  sweep.mockReset();
  sweep.mockResolvedValue(3);
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("GET /api/cron/sweep-login-attempts", () => {
  it("rejects with 401 when CRON_SECRET is set and the bearer token is wrong", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(
      new Request(URL, { headers: { authorization: "Bearer nope" } }),
    );
    expect(res.status).toBe(401);
    expect(sweep).not.toHaveBeenCalled();
  });

  it("runs the sweep and returns the removed count when the bearer token matches", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(
      new Request(URL, { headers: { authorization: "Bearer s3cret" } }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ removed: 3 });
    expect(sweep).toHaveBeenCalledOnce();
  });

  it("runs the sweep when CRON_SECRET is unset (local dev)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(new Request(URL));
    expect(res.status).toBe(200);
    expect(sweep).toHaveBeenCalledOnce();
  });
});

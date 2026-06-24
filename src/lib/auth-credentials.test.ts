import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyCredentials } from "@/lib/auth-credentials";

const findUnique = vi.mocked(prisma.user.findUnique);
const compare = vi.mocked(bcrypt.compare);

const row = {
  id: 1,
  email: "admin@example.com",
  passwordHash: "hashed",
  name: "Admin",
  createdAt: new Date(),
};

beforeEach(() => {
  findUnique.mockReset();
  compare.mockReset();
});

describe("verifyCredentials", () => {
  it("returns the session user for valid credentials", async () => {
    findUnique.mockResolvedValue(row);
    compare.mockResolvedValue(true as never);

    const result = await verifyCredentials("admin@example.com", "secret");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(result).toEqual({ id: "1", email: "admin@example.com", name: "Admin" });
  });

  it("returns null when the password is wrong", async () => {
    findUnique.mockResolvedValue(row);
    compare.mockResolvedValue(false as never);
    expect(await verifyCredentials("admin@example.com", "nope")).toBeNull();
  });

  it("returns null for an unknown email (no compare)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await verifyCredentials("ghost@example.com", "secret")).toBeNull();
    expect(compare).not.toHaveBeenCalled();
  });

  it("returns null for blank or non-string input (no db hit)", async () => {
    expect(await verifyCredentials("", "secret")).toBeNull();
    expect(await verifyCredentials("admin@example.com", "")).toBeNull();
    expect(await verifyCredentials(undefined, 123)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

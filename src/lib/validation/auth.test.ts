import { describe, it, expect } from "vitest";
import { z } from "zod";
import { loginSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("accepts a valid email and an 8+ char password", () => {
    const r = loginSchema.safeParse({
      email: "admin@example.com",
      password: "password123",
    });
    expect(r.success).toBe(true);
  });

  it("trims surrounding whitespace from the email", () => {
    const r = loginSchema.safeParse({
      email: "  admin@example.com  ",
      password: "password123",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("admin@example.com");
  });

  it("rejects an invalid email with a field message", () => {
    const r = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(z.flattenError(r.error).fieldErrors.email?.[0]).toBe(
        "Enter a valid email",
      );
    }
  });

  it("rejects a password shorter than 8 chars with a field message", () => {
    const r = loginSchema.safeParse({
      email: "admin@example.com",
      password: "short",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(z.flattenError(r.error).fieldErrors.password?.[0]).toBe(
        "Minimum of 8 characters is required",
      );
    }
  });

  it("rejects non-string input", () => {
    const r = loginSchema.safeParse({ email: 123, password: undefined });
    expect(r.success).toBe(false);
  });
});

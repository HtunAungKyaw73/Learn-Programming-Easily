# Admin Login Validation + Lockout Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared zod validation to the admin login flow and surface a distinct, honest lockout message when the brute-force throttle trips.

**Architecture:** A single client-safe zod schema (`loginSchema`) is the one source of truth, consumed by both the client form (per-field inline errors, no network call on failure) and the server (`verifyCredentials`). The existing DB-backed rate limiter is unchanged; `authorize` stops returning `null` for everything and instead throws `CredentialsSignin` subclasses whose `code` (`rate_limited` vs `invalid_credentials`) reaches the client via the `signIn(..., { redirect: false })` result, which the form maps to messages.

**Tech Stack:** Next.js (App Router), NextAuth v5 (beta), zod v4, bcryptjs, Vitest.

## Global Constraints

- **zod v4 API only.** Use top-level `z.email("...")` — NOT the deprecated `z.string().email()`. Use `z.flattenError(error)` — NOT the deprecated `error.flatten()`.
- **TypeScript** for all files. **Server Components by default**; the login page is already `"use client"`.
- **Password rule (exact copy):** `z.string().min(8, "Minimum of 8 characters is required")`.
- **Lockout message (exact copy):** `Too many failed attempts. Try again in about 15 minutes.`
- **Invalid-credentials message (exact copy):** `Invalid email or password` — stays generic, never reveals which credential was wrong (anti-enumeration).
- **Module boundary:** `src/lib/validation/auth.ts` must stay client-safe — no `fs`, no server-only or prisma imports.
- Thrown auth errors' messages/stacks must never reach the client; only their `code` is exposed (NextAuth handles this).
- Test command: `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.

---

### Task 1: Shared zod login schema

**Files:**
- Create: `src/lib/validation/auth.ts`
- Test: `src/lib/validation/auth.test.ts`
- Modify: `package.json` (add `zod` dependency)

**Interfaces:**
- Consumes: nothing.
- Produces: `loginSchema` (a `z.ZodObject` with `safeParse({ email, password })` → on success `data` is `{ email: string; password: string }` with `email` trimmed) and `type LoginInput = z.infer<typeof loginSchema>`. Field error keys are exactly `email` and `password`.

- [ ] **Step 1: Install zod**

Run: `npm install zod`
Expected: `zod` (v4.x) added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/validation/auth.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/validation/auth.test.ts`
Expected: FAIL — cannot resolve module `@/lib/validation/auth`.

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/validation/auth.ts`:

```ts
import { z } from "zod";

// Client-safe: no fs, no prisma, no server-only imports. Single source of
// truth for login input validation, shared by the form and verifyCredentials.
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Minimum of 8 characters is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/validation/auth.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/validation/auth.ts src/lib/validation/auth.test.ts
git commit -m "feat(auth): add shared zod login schema"
```

---

### Task 2: Server-side validation in verifyCredentials

**Files:**
- Modify: `src/lib/auth-credentials.ts`
- Modify: `src/lib/auth-credentials.test.ts`

**Interfaces:**
- Consumes: `loginSchema` from Task 1.
- Produces: `verifyCredentials(email: unknown, password: unknown): Promise<SessionUser | null>` — unchanged signature. Now returns `null` for any input that fails `loginSchema` (including passwords shorter than 8 chars) before touching the DB. `SessionUser = { id: string; email: string; name: string | null }`.

> **Note:** the existing test fixtures use 6-char passwords (`"secret"`, `"nope"`) which the new 8-char rule rejects. Step 1 updates them to 8+ chars so the happy/sad DB paths are still exercised.

- [ ] **Step 1: Update the existing test for the new contract**

Replace the body of `src/lib/auth-credentials.test.ts` from the `describe(...)` block onward (keep the mocks and imports above it) with:

```ts
describe("verifyCredentials", () => {
  it("returns the session user for valid credentials", async () => {
    findUnique.mockResolvedValue(row);
    compare.mockResolvedValue(true as never);

    const result = await verifyCredentials("admin@example.com", "password123");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(result).toEqual({ id: "1", email: "admin@example.com", name: "Admin" });
  });

  it("returns null when the password is wrong", async () => {
    findUnique.mockResolvedValue(row);
    compare.mockResolvedValue(false as never);
    expect(
      await verifyCredentials("admin@example.com", "wrongpassword"),
    ).toBeNull();
  });

  it("returns null for an unknown email (no compare)", async () => {
    findUnique.mockResolvedValue(null);
    expect(
      await verifyCredentials("ghost@example.com", "password123"),
    ).toBeNull();
    expect(compare).not.toHaveBeenCalled();
  });

  it("returns null for blank or non-string input (no db hit)", async () => {
    expect(await verifyCredentials("", "password123")).toBeNull();
    expect(await verifyCredentials("admin@example.com", "")).toBeNull();
    expect(await verifyCredentials(undefined, 123)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a password shorter than 8 chars (no db hit)", async () => {
    expect(await verifyCredentials("admin@example.com", "short")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for an invalid email (no db hit)", async () => {
    expect(await verifyCredentials("not-an-email", "password123")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify the new cases fail**

Run: `npx vitest run src/lib/auth-credentials.test.ts`
Expected: FAIL — the current implementation does no email-format or 8-char check, so "invalid email (no db hit)" and "short password (no db hit)" hit the DB / behave wrong.

- [ ] **Step 3: Rewrite verifyCredentials to use the schema**

Replace the full contents of `src/lib/auth-credentials.ts` with:

```ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/** Validate admin credentials. Returns the session user, or null on any failure. */
export async function verifyCredentials(
  email: unknown,
  password: unknown,
): Promise<SessionUser | null> {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return null;

  return { id: String(user.id), email: user.email, name: user.name };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth-credentials.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-credentials.ts src/lib/auth-credentials.test.ts
git commit -m "feat(auth): validate login input with zod schema server-side"
```

---

### Task 3: Distinct error codes from authorize

**Files:**
- Modify: `src/auth.ts`

**Interfaces:**
- Consumes: `verifyCredentials`, `getClientIp`, `checkRateLimit`, `recordFailure`, `recordSuccess` (all already imported).
- Produces: `authorize` now **throws** instead of returning `null` on failure — `RateLimitError` (`code = "rate_limited"`) when the IP is locked, `InvalidLoginError` (`code = "invalid_credentials"`) when credentials are bad. On success it returns the user unchanged. These codes surface to the client as `res.code` from `signIn(..., { redirect: false })`.

> **Note:** `authorize` is NextAuth wiring that is impractical to unit-test in isolation (it needs the full provider/runtime). This task is verified by typecheck/build here and end-to-end in Task 4's manual check. The branching logic it depends on (`verifyCredentials`, rate limiter) is already unit-tested.

- [ ] **Step 1: Add error classes and throw them in authorize**

In `src/auth.ts`:

Change the import on line 1 from:

```ts
import NextAuth from "next-auth";
```

to:

```ts
import NextAuth, { CredentialsSignin } from "next-auth";
```

Then, immediately after the imports block (before `export const { handlers, ... }`), add:

```ts
// NextAuth v5 exposes a thrown CredentialsSignin subclass's `code` to the
// client signIn result; the message/stack stay server-side. We use distinct
// codes so the login form can tell a lockout apart from bad credentials.
class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}
class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}
```

Replace the `authorize` function body so it reads:

```ts
      authorize: async (creds, request) => {
        const ip = getClientIp(request);
        if (!(await checkRateLimit(ip)).allowed) throw new RateLimitError();
        const user = await verifyCredentials(creds?.email, creds?.password);
        if (!user) {
          await recordFailure(ip);
          throw new InvalidLoginError();
        }
        await recordSuccess(ip);
        return user;
      },
```

- [ ] **Step 2: Typecheck / build to verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors. (If the project has no `tsc` script, this invokes the local TypeScript directly.)

- [ ] **Step 3: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all existing tests, including `auth-rate-limit.test.ts`, still green.

- [ ] **Step 4: Commit**

```bash
git add src/auth.ts
git commit -m "feat(auth): throw distinct error codes for lockout vs bad credentials"
```

---

### Task 4: Per-field validation + lockout message in the login form

**Files:**
- Modify: `src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `loginSchema` (Task 1) and the `res.code` values `rate_limited` / `invalid_credentials` (Task 3).
- Produces: user-facing behavior only — inline per-field errors on invalid input (no network call), and a distinct top-level message on lockout.

- [ ] **Step 1: Add imports for the schema and zod**

In `src/app/admin/login/page.tsx`, add to the import block (after the existing `import { site } from "@/lib/site";` line):

```tsx
import { z } from "zod";
import { loginSchema } from "@/lib/validation/auth";
```

- [ ] **Step 2: Add a password ref and field-error state**

Replace this block:

```tsx
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
```

with:

```tsx
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
```

- [ ] **Step 3: Replace onSubmit with client-side validation + code mapping**

Replace the entire `onSubmit` function with:

```tsx
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      const fe = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({ email: fe.email?.[0], password: fe.password?.[0] });
      if (fe.email?.[0]) emailRef.current?.focus();
      else if (fe.password?.[0]) passwordRef.current?.focus();
      return;
    }

    setPending(true);
    const res = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setPending(false);

    if (res?.error) {
      setError(
        res.code === "rate_limited"
          ? "Too many failed attempts. Try again in about 15 minutes."
          : "Invalid email or password",
      );
      // Focus management: return focus to the first field after an error.
      emailRef.current?.focus();
      emailRef.current?.select();
      return;
    }
    router.push("/admin");
    router.refresh();
  }
```

- [ ] **Step 4: Wire the email field — clear-on-edit, aria, inline error**

Replace the email `<input>` element (the one with `ref={emailRef}`) with:

```tsx
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                onChange={() =>
                  setFieldErrors((p) =>
                    p.email ? { ...p, email: undefined } : p,
                  )
                }
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                placeholder="you@example.com"
                className="rounded-lg border border-border bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-faint focus:border-terracotta"
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-terracotta-strong">
                  {fieldErrors.email}
                </p>
              )}
```

- [ ] **Step 5: Wire the password field — ref, clear-on-edit, aria, inline error**

Replace the password `<input>` element (the one inside the `relative` div, `id="password"`) with:

```tsx
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  onChange={() =>
                    setFieldErrors((p) =>
                      p.password ? { ...p, password: undefined } : p,
                    )
                  }
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-paper py-2.5 pl-3.5 pr-11 text-ink outline-none transition-colors placeholder:text-faint focus:border-terracotta"
                />
```

Then, immediately after the closing `</div>` of that `relative` wrapper (the div that holds the input + show/hide button), add the inline error:

```tsx
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-terracotta-strong">
                  {fieldErrors.password}
                </p>
              )}
```

- [ ] **Step 6: Lint/typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 7: Manual verification in the browser**

Start the dev server (preview_start) and exercise the login page (`/admin/login`):

1. Submit empty → inline "Email is required"-class message (here "Enter a valid email") under email; no network request fired.
2. Enter `not-an-email` + a 6-char password → inline "Enter a valid email" and "Minimum of 8 characters is required"; focus lands on email.
3. Fix email, type into password → that field's error clears on edit.
4. Valid-format but wrong credentials → top error "Invalid email or password".
5. Trip the limiter: submit wrong-but-valid-format credentials 5 times → 6th attempt shows "Too many failed attempts. Try again in about 15 minutes." (Confirm via preview_console_logs / preview_network that `res.code` is `rate_limited`.)

Capture a screenshot of the per-field error state and the lockout state as proof.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat(auth): per-field login validation and lockout messaging"
```

---

## Self-Review Notes

- **Spec coverage:** zod schema (Task 1) ✓; server validation replacing `typeof` guards (Task 2) ✓; distinct error codes for lockout vs invalid (Task 3) ✓; per-field client errors + static lockout message (Task 4) ✓; tests for schema and credentials (Tasks 1–2) ✓; rate-limit engine untouched ✓. Password `min(8)` reflected in schema and tests.
- **zod v4:** uses `z.email()` and `z.flattenError()` throughout — no deprecated calls.
- **Type consistency:** field-error keys `email`/`password` consistent across schema output, `flattenError`, state shape, and `aria-describedby` ids (`email-error`, `password-error`).
- **Security:** lockout thrown before any password compare (order preserved); bad-cred message generic; thrown messages stay server-side (only `code` exposed).

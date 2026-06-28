# Admin Login: Validation + Lockout Messaging — Design

**Date:** 2026-06-28
**Status:** Approved, pending implementation

## Problem

Two gaps in the admin login flow:

1. **No schema validation.** `verifyCredentials` hand-checks types with `typeof`
   guards; the login form sets `noValidate` and validates nothing. There is no
   shared schema and no per-field feedback.
2. **Lockout is invisible.** The brute-force throttle (DB-backed, keyed by IP)
   already works, but `authorize` returns `null` for *both* invalid credentials
   and a rate-limited attempt. NextAuth collapses that into one generic
   `CredentialsSignin` error, so the UI always shows "Invalid email or
   password" — even when the user is locked out for 15 minutes.

## What already exists (do not rebuild)

- `src/lib/auth-rate-limit.ts` — `checkRateLimit`, `recordFailure`,
  `recordSuccess`, `sweepStaleAttempts`, `getClientIp`. `MAX_ATTEMPTS = 5`,
  `WINDOW_MS = 15 min`. Tested.
- `LoginAttempt` Prisma model + Vercel cron sweep. Tested.
- `src/auth.ts` `authorize` already wires rate-limit check before verify.

The engine is sound. This work only adds **input validation** and **distinct
error surfacing** — it does not change throttle behavior.

## Decisions

- **Lockout message:** static — "Too many failed attempts. Try again in about
  15 minutes." The window is a fixed 15 minutes, so a static message is honest.
  No live countdown (avoids plumbing `retryAfter` to the client and a server
  action that would duplicate the password check).
- **Validation feedback:** per-field, inline under each input.
- **Surfacing mechanism:** NextAuth v5 custom error codes (Approach A below).

## Approach A: Custom error codes via NextAuth (chosen)

NextAuth v5 surfaces a thrown `CredentialsSignin` subclass's `code` property to
the client: `signIn(provider, { redirect: false })` returns
`{ error, code, status, ok }`, where `code` is read from the callback URL's
query string. `error` stays the generic `"CredentialsSignin"`; only `code`
differs. The thrown error's message and stack never reach the client.

Rejected alternatives:

- **B — Server Action wrapper.** Move validate + rate-limit + verify into a
  server action returning structured state, then call `signIn`. Buys a dynamic
  countdown and server-side field errors, but either re-runs `verify` inside
  `authorize` (double bcrypt) or guts `authorize` (weakens the single security
  gate). More moving parts for a static-message requirement. Not worth it.
- **C — Pre-check endpoint.** Client pings rate-limit status before `signIn`.
  Splits check-from-record (race conditions) and adds a round trip. Rejected.

## Components

### 1. Shared schema — `src/lib/validation/auth.ts` (new)

Client-safe module (no `fs`, no server-only imports — respects the
client/server module boundary). Single source of truth for both sides.

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Minimum of 8 characters is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### 2. Server validation — `src/lib/auth-credentials.ts` (modified)

Replace the manual `typeof email !== "string"` / trim / empty checks with
`loginSchema.safeParse({ email, password })`. On failure, return `null` (same
contract as today). On success, use the parsed/normalized values for the DB
lookup. Caller signature unchanged: still `(email, password) => user | null`.

### 3. Distinct error codes — `src/auth.ts` (modified)

```ts
import { CredentialsSignin } from "next-auth";

class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}
class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}
```

In `authorize` (order preserved — rate-check before verify):

- locked → `throw new RateLimitError()`
- verify fails → `recordFailure(ip)` then `throw new InvalidLoginError()`
- success → `recordSuccess(ip)`, return user

### 4. Client — `src/app/admin/login/page.tsx` (modified)

- On submit: `loginSchema.safeParse(...)` against the form values. On failure,
  set per-field error state (`{ email?: string; password?: string }`), render
  each message inline under its field with `aria-invalid` + `aria-describedby`,
  focus the first invalid field, and make **no network call**.
- On success: call `signIn("credentials", { redirect: false })`, then read
  `res.code`:
  - `"rate_limited"` → "Too many failed attempts. Try again in about 15 minutes."
  - anything else (error present) → "Invalid email or password." (Stays generic
    — never reveals which credential was wrong.)
- Field-level errors clear when the user edits that field.

## Data flow

```
submit
  → client zod parse
      fail → inline field errors, stop (no request)
      pass → signIn(credentials, redirect:false)
                → authorize: checkRateLimit(ip)
                    locked    → throw RateLimitError      → res.code "rate_limited"
                    allowed   → verifyCredentials (zod + bcrypt)
                                  fail → recordFailure → throw InvalidLoginError → res.code "invalid_credentials"
                                  ok   → recordSuccess → return user → res.ok
  → client maps res.code → message, or routes to /admin on success
```

## Error handling / security

- Thrown errors' messages and stacks stay server-side; only `code` is exposed.
- Bad-credential message stays generic (no user enumeration, no
  which-field-wrong hint).
- Rate-limit ordering unchanged: a locked IP is rejected before any password
  comparison.

## Testing (Vitest, TDD)

- `src/lib/validation/auth.test.ts` (new): valid input passes; invalid/empty
  email fails with the right message; empty password fails; email is trimmed.
- `src/lib/auth-credentials.test.ts` (extend): rejects malformed input
  (non-string, empty, bad email) via the schema; existing happy/sad paths hold.
- Existing `auth-rate-limit.test.ts` untouched.

## Out of scope (YAGNI)

Live countdown timer; email/account-based throttle; password-strength rules;
CAPTCHA; changes to the cron sweep or `LoginAttempt` model.

## Files

- `+ src/lib/validation/auth.ts`
- `+ src/lib/validation/auth.test.ts`
- `~ src/lib/auth-credentials.ts`
- `~ src/lib/auth-credentials.test.ts`
- `~ src/auth.ts`
- `~ src/app/admin/login/page.tsx`
- `+ zod` (dependency)

# Phase 7 (Slice 2) — Auth Hardening & Deferred — Design

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Second Phase 7 polish slice. Close the deferred auth loose ends: expose `session.user.id`, migrate `middleware.ts` → `proxy.ts`, and add DB-backed login rate-limiting. Single-admin app; Vercel/Neon.

## Goal

Harden the existing Auth.js v5 credentials flow: make the admin's id available on the session (for Phase-6+ code), adopt Next 16's `proxy` convention, and throttle brute-force login attempts — without changing the login UX.

## Decisions (locked)

- **`session.user.id`:** add `jwt` + `session` callbacks; type via a `next-auth.d.ts` augmentation.
- **`proxy` rename:** `src/middleware.ts` → `src/proxy.ts`, export renamed `auth` → `proxy`. Next 16 runs `proxy` on the **Node.js runtime** (edge unsupported there) — acceptable for our auth gate. This is a **file move** (needs explicit go-ahead at execution).
- **Rate-limiting:** DB-backed, keyed by **IP** (not email — email keying would let an attacker lock the admin out). Threshold **5 failures / 15-minute window**; blocked until failures age out. New `LoginAttempt` table.
- **Temp admin:** operational only — owner runs `npm run admin:create` with real creds. No helper script.
- No login-UX change; no new runtime npm deps.

## Components

### `session.user.id` — `src/auth.ts` + `src/types/next-auth.d.ts`

Add to the `NextAuth({...})` config in `auth.ts`:

```ts
callbacks: {
  ...authConfig.callbacks,
  jwt({ token, user }) {
    if (user) token.id = user.id;
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string;
    return session;
  },
},
```

(Spread `authConfig.callbacks` so the existing `authorized` callback is preserved.)

`src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
```

### `middleware` → `proxy` — `src/proxy.ts`

Move `src/middleware.ts` to `src/proxy.ts`; content becomes:

```ts
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

export const config = { matcher: ["/admin/:path*"] };
```

The `authorized` callback in `auth.config.ts` still drives the gate. Runtime is now Node.js (Next 16 `proxy` does not support edge) — fine, since `auth.config.ts` stays free of Prisma/bcrypt regardless.

### Rate-limiting

**Schema** — add to `prisma/schema.prisma` + migration `add_login_attempt`:

```prisma
model LoginAttempt {
  id         Int      @id @default(autoincrement())
  identifier String
  createdAt  DateTime @default(now())

  @@index([identifier, createdAt])
}
```

**`src/lib/auth-rate-limit.ts`** (server-only):

```ts
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export function getClientIp(request: Request): string;        // first x-forwarded-for, else "unknown"
export function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSec: number }>;
export function recordFailure(ip: string): Promise<void>;     // insert + prune this IP's rows older than the window
export function recordSuccess(ip: string): Promise<void>;     // delete this IP's rows
```

- `checkRateLimit`: `count` of rows for `identifier === ip` with `createdAt >= now - WINDOW_MS`; `allowed = count < MAX_ATTEMPTS`; `retryAfterSec = WINDOW_MS/1000` when blocked, else 0.
- Pure-ish (only depends on `@/lib/prisma`), so unit-testable with a mocked prisma.

**Integration** — `src/auth.ts` `authorize(creds, request)`:

```
const ip = getClientIp(request);
if (!(await checkRateLimit(ip)).allowed) return null;   // locked
const user = await verifyCredentials(creds?.email, creds?.password);
if (!user) { await recordFailure(ip); return null; }
await recordSuccess(ip);
return user;
```

The login form already shows a generic "Invalid email or password" on `null`; a locked-out attempt returns `null` too (no separate lockout message — avoids confirming the account exists). This is acceptable for v1.

## Error / edge handling

- Missing `x-forwarded-for` → `getClientIp` returns `"unknown"`; all unknown-IP attempts share one bucket (acceptable; locally there's no proxy header).
- A rate-limited attempt and a wrong password both return `null` → identical UX, no enumeration.
- `recordFailure` prunes stale rows for the IP so the table doesn't grow unbounded for a hammering attacker.
- DB error inside `checkRateLimit`/`record*` propagates; `authorize` returning a rejected promise surfaces as a failed sign-in (fail-closed-ish). Acceptable.

## Testing (TDD — write tests first)

**`src/lib/auth-rate-limit.test.ts`** (mock `@/lib/prisma`):
- `checkRateLimit`: count `< 5` → `{ allowed: true, retryAfterSec: 0 }`.
- count `>= 5` → `{ allowed: false, retryAfterSec: 900 }`.
- queries with a `createdAt >= now - WINDOW_MS` filter (assert the `where` shape passed to `count`).
- `recordFailure` inserts a row for the IP and prunes old ones (assert `create` + `deleteMany` called with the IP).
- `recordSuccess` deletes the IP's rows (assert `deleteMany` with `{ identifier: ip }`).
- `getClientIp` parses the first IP from `x-forwarded-for`; returns `"unknown"` when absent.

**Gates:** `npm test` (suite grows by the new cases), `npm run build` (succeeds; `proxy.ts` recognized, no middleware deprecation warning), `npm run lint` (clean), migration applies.

## Out of scope (later slices / future)

- SEO finishing — slice 3. Accessibility & responsive — slice 4.
- A distinct "account locked, try later" message; CAPTCHA; per-account (vs per-IP) limits.
- Replacing the temp admin (operational owner step, documented only).
- Edge-runtime proxy (Next 16 doesn't support it; not needed).

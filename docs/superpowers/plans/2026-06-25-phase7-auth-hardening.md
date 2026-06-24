# Phase 7 Slice 2 — Auth Hardening & Deferred — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `session.user.id`, add DB-backed login rate-limiting, and migrate `middleware.ts` → `proxy.ts`.

**Architecture:** A `LoginAttempt` table backs a small `auth-rate-limit` module (count failures per IP in a window). The Credentials `authorize` composes it with the existing `verifyCredentials`. `jwt`/`session` callbacks surface the admin id, typed via a `next-auth.d.ts` augmentation. The Next-16 `proxy` convention replaces `middleware`.

**Tech Stack:** Next.js 16 (proxy convention, Node runtime), Auth.js v5, Prisma 7, Vitest.

## Global Constraints

- TypeScript everywhere. No login-UX change; no new runtime npm deps.
- Rate-limiting is DB-backed, keyed by **IP** (never email). Threshold **5 failures / 15-minute window**.
- A locked-out attempt and a wrong password both return `null` (identical UX, no account enumeration).
- `proxy` runs on the **Node.js runtime** (Next 16 — edge unsupported in proxy); `auth.config.ts` stays free of Prisma/bcrypt regardless.
- Prisma CLI / scripts under **Node 22+**: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null`.
- Existing suite (13 tests) stays green; migrations tracked, generated client gitignored.
- Existing source: `verifyCredentials(email: unknown, password: unknown): Promise<{ id: string; email: string; name: string | null } | null>` at `@/lib/auth-credentials`; `prisma` singleton at `@/lib/prisma`; `auth.config.ts` default-exports a `NextAuthConfig` whose `callbacks.authorized` gates `/admin/*`; current `src/middleware.ts` is `export const { auth: middleware } = NextAuth(authConfig); export const config = { matcher: ["/admin/:path*"] };` (note: it currently uses a two-statement form for the named export).

---

### Task 1: `LoginAttempt` model + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration under `prisma/migrations/`

**Interfaces:**
- Produces: `prisma.loginAttempt` with row shape `{ id: number; identifier: string; createdAt: Date }`.

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma`:

```prisma
model LoginAttempt {
  id         Int      @id @default(autoincrement())
  identifier String
  createdAt  DateTime @default(now())

  @@index([identifier, createdAt])
}
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run db:migrate -- --name add_login_attempt
```
Expected: `Applying migration ...add_login_attempt`, "in sync", client regenerates; `prisma/migrations/<ts>_add_login_attempt/migration.sql` contains `CREATE TABLE "LoginAttempt"`.

- [ ] **Step 3: Verify the model is generated**

Run: `grep -rl "loginAttempt\|LoginAttempt" src/generated/prisma/models 2>/dev/null | head -1`
Expected: prints a path (the model client exists).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(auth): LoginAttempt model + migration for rate limiting"
```

---

### Task 2: `auth-rate-limit` library (TDD)

**Files:**
- Create: `src/lib/auth-rate-limit.ts`
- Test: `src/lib/auth-rate-limit.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (mocked in tests).
- Produces:
  - `MAX_ATTEMPTS = 5`, `WINDOW_MS = 900000`
  - `getClientIp(request: Request): string`
  - `checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSec: number }>`
  - `recordFailure(ip: string): Promise<void>`
  - `recordSuccess(ip: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth-rate-limit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/auth-rate-limit.test.ts`
Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth-rate-limit.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/auth-rate-limit.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-rate-limit.ts src/lib/auth-rate-limit.test.ts
git commit -m "feat(auth): DB-backed login rate-limit module"
```

---

### Task 3: `auth.ts` — session.user.id + rate-limited authorize + types

**Files:**
- Modify: `src/auth.ts`
- Create: `src/types/next-auth.d.ts`

**Interfaces:**
- Consumes: `verifyCredentials`; `getClientIp`, `checkRateLimit`, `recordFailure`, `recordSuccess` from `@/lib/auth-rate-limit`.
- Produces: `session.user.id` typed and populated.

- [ ] **Step 1: Add the type augmentation**

Create `src/types/next-auth.d.ts`:

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

- [ ] **Step 2: Rewrite auth.ts**

Replace the contents of `src/auth.ts` with:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { verifyCredentials } from "@/lib/auth-credentials";
import {
  getClientIp,
  checkRateLimit,
  recordFailure,
  recordSuccess,
} from "@/lib/auth-rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds, request) => {
        const ip = getClientIp(request);
        if (!(await checkRateLimit(ip)).allowed) return null;
        const user = await verifyCredentials(creds?.email, creds?.password);
        if (!user) {
          await recordFailure(ip);
          return null;
        }
        await recordSuccess(ip);
        return user;
      },
    }),
  ],
});
```

- [ ] **Step 3: Verify build + existing tests**

Run:
```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm test && npm run build && npm run lint
```
Expected: tests green (rate-limit suite included); build succeeds (types resolve — `session.user.id` is now typed, `token.id` accepted); lint clean. The `authorize` composition is thin glue verified by the build; its pieces are unit-tested in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/auth.ts src/types/next-auth.d.ts
git commit -m "feat(auth): expose session.user.id; rate-limit the authorize flow"
```

---

### Task 4: `middleware` → `proxy` rename

> **EXECUTION NOTE:** Step 1 is a file MOVE. If running under a permission policy that gates deletes/moves, get explicit approval before running it.

**Files:**
- Move: `src/middleware.ts` → `src/proxy.ts`

**Interfaces:**
- Consumes: `auth.config.ts` (unchanged).

- [ ] **Step 1: Move the file**

```bash
git mv src/middleware.ts src/proxy.ts
```

- [ ] **Step 2: Rename the export to `proxy`**

Replace the contents of `src/proxy.ts` with:

```ts
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 3: Verify build + gate**

Run:
```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
npm run build && npm run lint
```
Expected: build succeeds with **no** "`middleware` convention is deprecated / superseded by `proxy`" warning; the build output still shows a Proxy entry; lint clean. (The `authorized` callback in `auth.config.ts` continues to gate `/admin/*`.)

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "chore(auth): migrate middleware.ts to proxy.ts (Next 16 convention)"
```

---

## Self-Review

**Spec coverage:**
- `session.user.id` callbacks + `next-auth.d.ts` → Task 3. ✓
- `middleware` → `proxy` rename (Node runtime) → Task 4. ✓
- `LoginAttempt` model + migration → Task 1. ✓
- Rate-limit lib (getClientIp/checkRateLimit/recordFailure/recordSuccess, 5/15min, by IP) → Task 2. ✓
- `authorize` composition (check → verify → record) → Task 3. ✓
- No-enumeration (null on lockout and on bad creds) → Task 3 `authorize` returns `null` both ways. ✓
- Temp admin (operational) → not code, documented in spec only. ✓ (no task — intentional)

**Placeholder scan:** No TBD/TODO; full code for every change. ✓

**Type consistency:** `getClientIp/checkRateLimit/recordFailure/recordSuccess` signatures match between Task 2's definitions and Task 3's `authorize` usage. `checkRateLimit` returns `{ allowed, retryAfterSec }` and `authorize` reads `.allowed`. `token.id` (JWT augmentation) and `session.user.id` (Session augmentation) are both declared in Task 3's `next-auth.d.ts`. `prisma.loginAttempt` (Task 1) matches the mocked surface in Task 2. ✓

## Notes / Risks

- `proxy` runs on Node runtime in Next 16; `NextAuth(authConfig).auth` works there (no Prisma/bcrypt in `auth.config.ts`).
- Local dev has no `x-forwarded-for`, so all local attempts share the `"unknown"` bucket — acceptable; production behind Vercel sets the header.
- `LoginAttempt` rows accrue for active attackers but are pruned per-IP on each failure and cleared on success; a global sweep is unnecessary at single-admin scale.
- Tests use the global `Request` (Node 18+), available in Vitest's node environment.

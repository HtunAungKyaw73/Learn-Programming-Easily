# Phase 5 — Auth

> Gate the admin area behind a login. Single admin user, password credentials, JWT sessions, route protection, and a real brute-force defense.

## The problem

The admin panel can create, edit, and delete content. It **must** be protected. Requirements:

- A **login** for the single owner — email + password.
- **Sessions** so you stay logged in across requests.
- Every `/admin/*` route **blocked** unless authenticated — but the login page itself must stay reachable (or you get a redirect loop).
- Passwords stored **safely** (never plaintext).
- **Brute-force resistance** — an attacker shouldn't get unlimited password guesses.

Auth is security-critical, so the rationale below is more careful than usual, and the **threat model** is called out explicitly.

## The rationale

| Decision | Why |
|---|---|
| **Auth.js v5 (`next-auth`)** | The standard auth library for Next.js; handles session cookies, CSRF, and the callback plumbing so we don't roll our own. |
| **Credentials provider** | A single owner doesn't need OAuth/Google. Email+password against our own `User` table is the simplest correct option. |
| **bcrypt password hashing** | Never store plaintext. bcrypt is a slow, salted hash designed for passwords — resistant to brute-force and rainbow tables. |
| **JWT session strategy** | Stateless sessions (signed token in a cookie) — no session table to manage for one user. |
| **DB-backed rate limiting** | Limit login attempts per client IP, persisted in Postgres so it survives serverless cold starts (in-memory counters wouldn't). |

## What was built

- [`src/auth.config.ts`](../../src/auth.config.ts) — edge-safe config: pages, session strategy, the `authorized` route-gate callback.
- [`src/auth.ts`](../../src/auth.ts) — the full Auth.js instance: the Credentials provider + JWT/session callbacks.
- [`src/lib/auth-credentials.ts`](../../src/lib/auth-credentials.ts) — `verifyCredentials()`: look up user, bcrypt-compare password.
- [`src/lib/auth-rate-limit.ts`](../../src/lib/auth-rate-limit.ts) — the throttle (`getClientIp`, `checkRateLimit`, `recordFailure`, `recordSuccess`, `sweepStaleAttempts`).
- [`src/proxy.ts`](../../src/proxy.ts) — middleware that runs the gate on `/admin/*` requests.
- [`src/app/api/auth/[...nextauth]/route.ts`](../../src/app/api/auth/[...nextauth]/route.ts) — the Auth.js HTTP endpoints.
- [`src/lib/actions/auth-guard.ts`](../../src/lib/actions/auth-guard.ts) — `requireAuth()` for protecting Server Actions.
- `User` and `LoginAttempt` models in [`prisma/schema.prisma`](../../prisma/schema.prisma).
- [`scripts/create-admin.ts`](../../scripts/create-admin.ts) — one-off script to create the admin user.

## How it works

### The split config: `auth.config.ts` vs `auth.ts`

Auth.js v5 encourages splitting config in two, and there's a real reason:

- **`auth.config.ts`** holds only **edge-safe** logic — no database imports. It defines the `authorized` callback used by middleware, which runs on the Edge runtime where `fs`/native DB drivers aren't available.
- **`auth.ts`** holds the full setup, including the `Credentials` provider whose `authorize` function *does* hit the database (bcrypt, Prisma).

This split lets [`proxy.ts`](../../src/proxy.ts) (middleware) import the *lightweight* config without dragging the DB into the edge bundle.

### The route gate

```ts
// auth.config.ts — runs in middleware for every matched request
authorized({ auth, request: { nextUrl } }) {
  const isLoggedIn = !!auth?.user;
  const onLogin = nextUrl.pathname.startsWith("/admin/login");
  const onAdmin = nextUrl.pathname.startsWith("/admin");
  if (onLogin) return true;        // ALWAYS allow the login page…
  if (onAdmin) return isLoggedIn;  // …then gate everything else under /admin
  return true;
}
```

**The bug this avoids:** if you gated `/admin/*` *before* exempting `/admin/login`, then a logged-out user visiting `/admin/login` would be redirected to… `/admin/login`, forever. **Order matters** — exempt the login page first. (The same loop got fixed structurally with a `(protected)` route group; see [Phase 6](06-admin-panel.md).)

[`proxy.ts`](../../src/proxy.ts) wires this to run only on `/admin/:path*`:

```ts
const { auth: proxy } = NextAuth(authConfig);
export { proxy };
export const config = { matcher: ["/admin/:path*"] };
```

> *Naming note:* the middleware file is `proxy.ts`, not `middleware.ts` — that's the Next.js 16 convention this project migrated to (`chore(auth): migrate middleware.ts to proxy.ts`).

### Verifying a password — safely

```ts
// auth-credentials.ts
export async function verifyCredentials(email, password): Promise<SessionUser | null> {
  if (typeof email !== "string" || typeof password !== "string") return null;  // reject junk
  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);   // constant-ish time compare
  if (!ok) return null;
  return { id: String(user.id), email: user.email, name: user.name };
}
```

Security concepts:
- **Returns `null` on *every* failure path** (bad type, no user, wrong password) — a caller can't distinguish "no such user" from "wrong password," which avoids user-enumeration leaks.
- **`bcrypt.compare`** re-hashes the input with the stored salt and compares — the plaintext is never stored or logged.
- Passwords are hashed with `bcrypt.hash(password, 10)` when the admin is created (see [`create-admin.ts`](../../scripts/create-admin.ts)).

### Sessions: the JWT callbacks

```ts
// auth.ts
jwt({ token, user })   { if (user) token.id = user.id; return token; }   // login → stash id in token
session({ session, token }) { if (token.id) session.user.id = token.id; return session; }  // expose id
```

**Concept:** with the JWT strategy, the session lives in a signed cookie. The `jwt` callback runs at sign-in to put the user id into the token; the `session` callback copies it onto `session.user.id` so server code can read *who* is logged in. (`src/types/next-auth.d.ts` augments the session type so `user.id` is typed.)

### Brute-force rate limiting — and its threat model

The `authorize` flow checks the throttle *before* verifying the password:

```ts
// auth.ts
authorize: async (creds, request) => {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip)).allowed) return null;   // locked out → reject
  const user = await verifyCredentials(creds?.email, creds?.password);
  if (!user) { await recordFailure(ip); return null; }    // wrong → count it
  await recordSuccess(ip);                                 // right → clear the bucket
  return user;
}
```

The limiter ([`auth-rate-limit.ts`](../../src/lib/auth-rate-limit.ts)) is **DB-backed**: each failed attempt is a `LoginAttempt` row keyed by IP. `checkRateLimit` counts rows in the last 15 minutes; **5+** ⇒ locked out. Why a DB and not an in-memory counter? On serverless (Vercel), each request may hit a fresh instance — an in-memory counter resets constantly and provides no protection. A shared table is the source of truth.

**The IP-spoofing threat (important):** the throttle is only as good as the IP it keys on.

```ts
// getClientIp — uses Vercel's trusted ipAddress(), NOT the raw x-forwarded-for
const trusted = ipAddress(request);   // platform-derived, client cannot forge
if (trusted) return trusted;
const realIp = request.headers.get("x-real-ip")?.trim();  // trusted-proxy fallback
return realIp || "unknown";           // local dev: one shared bucket
```

If we naïvely read the first `x-forwarded-for` entry, an attacker could send a *different* fake IP on every request — minting a fresh throttle bucket each time and bypassing the limit entirely. Using Vercel's `ipAddress()` (derived from the actual connection) closes that hole. This is documented in `docs(auth): note accepted x-forwarded-for spoofing risk`.

**The orphan-rows problem:** `recordFailure` only prunes rows for the IP it just touched. A rotating-IP attacker would leave behind rows that never age out. `sweepStaleAttempts()` is a global prune, run on a schedule by a **Vercel cron** ([`src/app/api/cron/sweep-login-attempts/route.ts`](../../src/app/api/cron/sweep-login-attempts/route.ts)), to reap them.

### Protecting Server Actions

Middleware guards *page navigations*. But Server Actions (Phase 6) are callable POST endpoints — they need their own check:

```ts
// auth-guard.ts
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}
```

Every mutating action calls `await requireAuth()` first. **Defense in depth:** never trust that "the middleware already checked" — verify auth at the action boundary too.

## Trade-offs & gotchas

- **Single user, by design.** There's no signup, no roles, no password reset UI. Adding an admin is a CLI operation: set `ADMIN_EMAIL`/`ADMIN_PASSWORD` and run `npm run admin:create`.
- **Two layers of protection** (middleware *and* `requireAuth`) is intentional redundancy. Removing either leaves a hole.
- **`AUTH_SECRET` must be set** (signs the JWT). Without it, sessions break. It's an env var, not in the repo.
- **Rate-limit accuracy depends on the platform IP.** Locally everything shares the `"unknown"` bucket — fine for dev, but don't reason about throttle behavior from local testing alone.

## Explore it yourself

```bash
npm test          # auth-credentials + auth-rate-limit unit tests
# create the admin (needs a live DB + env vars):
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run admin:create
npm run dev       # visit /admin → bounced to /admin/login
```

Open:
1. [`src/auth.config.ts`](../../src/auth.config.ts) — the gate; note the ordering comment.
2. [`src/lib/auth-credentials.ts`](../../src/lib/auth-credentials.ts) — uniform `null` failures.
3. [`src/lib/auth-rate-limit.ts`](../../src/lib/auth-rate-limit.ts) — read the `getClientIp` doc comment in full; that's the threat model.

→ Next: [Phase 6 — Admin Panel](06-admin-panel.md)

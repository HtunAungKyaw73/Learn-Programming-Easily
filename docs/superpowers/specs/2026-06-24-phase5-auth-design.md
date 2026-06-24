# Phase 5 — Auth — Design

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Single-admin authentication with Auth.js v5 (next-auth) credentials provider. Login, logout, JWT session, and route protection for `/admin/*`. A placeholder protected dashboard proves the gate; real CRUD is Phase 6.

## Goal

The site owner signs in with email + password and reaches a protected `/admin`
area. Everyone else is redirected to the login page. Credentials are stored
(hashed) in Postgres.

## Decisions (locked)

- **Library:** Auth.js v5 (`next-auth@5.0.0-beta`), Credentials provider.
- **Credential store:** new `User` table in Postgres; password stored as a bcrypt hash.
- **Session:** JWT strategy (required by the credentials provider).
- **No PrismaAdapter:** credentials + JWT does not use DB sessions; the adapter
  would require `Account`/`Session`/`VerificationToken` tables we do not want.
  `authorize` queries `User` directly via the existing `prisma` singleton.
- **Hashing:** `bcryptjs` (pure JS — no native bindings, no edge-binding issues).
- **Routes:** login at `/admin/login`, dashboard at `/admin`.
- **Edge safety:** split config — `auth.config.ts` (edge-safe: pages + `authorized`
  callback, no Prisma/bcrypt) used by middleware; `auth.ts` adds the Credentials
  provider with `authorize`.

## Components

### Schema — `prisma/schema.prisma` (+ migration)

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
}
```

New migration `add_user`. Run via `npm run db:migrate -- --name add_user` (Node 22).

### `src/lib/auth-credentials.ts` (pure, testable)

```ts
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

// Returns the user on valid credentials, else null. No throwing on bad input.
export async function verifyCredentials(
  email: unknown,
  password: unknown,
): Promise<SessionUser | null>;
```

- Guards: both fields must be non-empty strings, else `null`.
- `prisma.user.findUnique({ where: { email } })`; if absent → `null`.
- `bcrypt.compare(password, user.passwordHash)`; if false → `null`.
- On success returns `{ id: String(user.id), email, name }`.
- This is the unit-tested core; `authorize` is a thin wrapper over it.

### `src/auth.config.ts` (edge-safe — NO Prisma/bcrypt)

```ts
import type { NextAuthConfig } from "next-auth";

export default {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // real provider added in auth.ts (Node runtime)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onLogin = nextUrl.pathname.startsWith("/admin/login");
      const onAdmin = nextUrl.pathname.startsWith("/admin");
      if (onLogin) return true;            // login page always reachable
      if (onAdmin) return isLoggedIn;      // gate the rest of /admin
      return true;
    },
  },
} satisfies NextAuthConfig;
```

### `src/auth.ts` (Node runtime — full config)

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { verifyCredentials } from "@/lib/auth-credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (creds) => verifyCredentials(creds?.email, creds?.password),
    }),
  ],
});
```

### `src/middleware.ts` (edge — uses edge-safe config only)

```ts
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = { matcher: ["/admin/:path*"] };
```

Unauthenticated requests to `/admin/*` (except `/admin/login`) → redirected to
`/admin/login` by the `authorized` callback.

### `src/app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### `src/app/admin/login/page.tsx` (`"use client"`)

- Email + password form. On submit: `signIn("credentials", { email, password, redirectTo: "/admin" })`.
- On failure (next-auth throws `CredentialsSignin` / returns error) show an inline
  "Invalid email or password" message; do not leak which field was wrong.

### `src/app/admin/page.tsx` (server, protected)

- `const session = await auth();` — render "Signed in as {session.user.email}".
- Sign-out is a `<form>` with an inline server action (keeps the page a server
  component): `action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}` and a submit button. Placeholder only.

### `scripts/create-admin.ts` (Node 22, `tsx`)

- Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD`; exits with a clear error if either is missing.
- `bcrypt.hash(password, 10)`; `prisma.user.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } })` — idempotent.
- `npm run admin:create`.

## Data flow

```
login form ─signIn("credentials")─> authorize ─> verifyCredentials
                                                    │ prisma.user.findUnique
                                                    │ bcrypt.compare
                                                    ▼
                                     valid → JWT session cookie
                                                    │
/admin/* request ─> middleware (edge) ─> authorized callback ─> allow | redirect /admin/login
```

## Environment / deps

- Deps: `bcryptjs` + `@types/bcryptjs` (dev), `tsx` (dev). `next-auth` already present.
- Env: `AUTH_SECRET` (must be a real value — `openssl rand -base64 32`),
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` (used only by `create-admin`).

## Error / edge handling

- Missing/blank email or password → `verifyCredentials` returns `null` → generic login error.
- Unknown email and wrong password produce the **same** generic error (no user enumeration).
- `create-admin` with missing env → non-zero exit + message; never creates a blank-password user.
- Visiting `/admin/login` while already authenticated → allowed (optionally redirect to `/admin`; not required for v1).

## Testing (TDD — write tests first)

**`src/lib/auth-credentials.test.ts`** (Vitest, mock `@/lib/prisma` and `bcryptjs`):
- valid email + correct password → returns `{ id, email, name }`.
- correct email + wrong password (`bcrypt.compare` → false) → `null`.
- unknown email (`findUnique` → null) → `null`.
- empty/blank or non-string email or password → `null` (no prisma call).

Middleware redirect and the full sign-in round-trip are integration concerns,
verified via `npm run build` + manual check, not unit tests.

## Out of scope (deferred)

- Multi-user, registration, OAuth providers.
- Password reset / change-password UI.
- Login rate-limiting / lockout (note as future hardening).
- Remember-me / session-length tuning beyond defaults.

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { site } from "@/lib/site";
import { z } from "zod";
import { loginSchema } from "@/lib/validation/auth";

export default function LoginPage() {
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

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12">
      <div className="fade-in w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:text-terracotta"
          >
            {site.name}
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Admin sign in
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in to manage your articles.
          </p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-ink"
              >
                Email
              </label>
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-ink"
              >
                Password
              </label>
              <div className="relative">
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
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-faint transition-colors hover:text-terracotta"
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-terracotta-strong">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-3.5 py-2.5 text-sm text-terracotta-strong"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 font-medium text-white transition-colors hover:bg-terracotta-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:opacity-60 dark:text-paper"
            >
              {pending && (
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-muted transition-colors hover:text-terracotta"
          >
            ← Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}

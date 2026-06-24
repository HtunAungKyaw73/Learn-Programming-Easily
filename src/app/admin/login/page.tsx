"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Admin sign in
      </h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-100"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-100"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

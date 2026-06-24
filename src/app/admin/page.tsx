import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Signed in as {session.user.email}. Article management arrives in Phase 6.
      </p>
    </div>
  );
}

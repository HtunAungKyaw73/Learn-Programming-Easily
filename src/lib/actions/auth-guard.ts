import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Require an authenticated admin session. Redirects to login if not signed in.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

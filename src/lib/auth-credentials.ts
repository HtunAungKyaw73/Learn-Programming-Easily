import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return { id: String(user.id), email: user.email, name: user.name };
}

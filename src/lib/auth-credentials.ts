import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

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
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return null;

  return { id: String(user.id), email: user.email, name: user.name };
}

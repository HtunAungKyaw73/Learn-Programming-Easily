import { z } from "zod";

// Client-safe: no fs, no prisma, no server-only imports. Single source of
// truth for login input validation, shared by the form and verifyCredentials.
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Minimum of 8 characters is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

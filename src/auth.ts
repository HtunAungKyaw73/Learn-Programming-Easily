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

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { verifyCredentials } from "@/lib/auth-credentials";
import {
  getClientIp,
  checkRateLimit,
  recordFailure,
  recordSuccess,
} from "@/lib/auth-rate-limit";

// NextAuth v5 exposes a thrown CredentialsSignin subclass's `code` to the
// client signIn result; the message/stack stay server-side. We use distinct
// codes so the login form can tell a lockout apart from bad credentials.
class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}
class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  logger: {
    // A rejected/locked login throws CredentialsSignin (our RateLimitError /
    // InvalidLoginError), which Auth.js's default logger prints as a noisy
    // stack trace on every failed attempt. That path is expected control flow
    // — the `code` already reaches the client — so swallow it and forward
    // every other auth error to the console untouched.
    error(error) {
      if (error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
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
        if (!(await checkRateLimit(ip)).allowed) throw new RateLimitError();
        const user = await verifyCredentials(creds?.email, creds?.password);
        if (!user) {
          await recordFailure(ip);
          throw new InvalidLoginError();
        }
        await recordSuccess(ip);
        return user;
      },
    }),
  ],
});

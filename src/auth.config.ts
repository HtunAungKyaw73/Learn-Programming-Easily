import type { NextAuthConfig } from "next-auth";

export default {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onLogin = nextUrl.pathname.startsWith("/admin/login");
      const onAdmin = nextUrl.pathname.startsWith("/admin");
      if (onLogin) return true;
      if (onAdmin) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;

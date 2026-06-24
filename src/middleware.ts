import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth: middleware } = NextAuth(authConfig);

export { middleware };

export const config = { matcher: ["/admin/:path*"] };

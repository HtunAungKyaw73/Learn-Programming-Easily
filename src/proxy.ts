import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth: proxy } = NextAuth(authConfig);

export { proxy };

export const config = { matcher: ["/admin/:path*"] };

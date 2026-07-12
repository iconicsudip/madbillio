import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Trust the incoming request's Host header to derive the base URL instead
  // of a fixed AUTH_URL/NEXTAUTH_URL — this app's dev port varies (another
  // project on this machine often holds 3000), so a hardcoded URL breaks
  // the post-login redirect whenever the port differs.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;

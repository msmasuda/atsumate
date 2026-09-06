import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? "atsumate-web",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "not-configured",
      issuer:
        process.env.KEYCLOAK_ISSUER ??
        "http://192.168.100.2:8080/realms/langgraph",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

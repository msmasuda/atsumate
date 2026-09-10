import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { authenticatePassword } from "@/lib/auth-service";
import { getPrisma } from "@/lib/db";

const credentials = Credentials({
  credentials: {
    email: { label: "メールアドレス", type: "email" },
    password: { label: "パスワード", type: "password" },
  },
  async authorize(values, request) {
    const parsed = z.object({
      email: z.email().max(254),
      password: z.string().min(1).max(128),
    }).safeParse(values);
    if (!parsed.success) return null;
    return authenticatePassword(parsed.data.email, parsed.data.password, request.headers);
  },
});

const google = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  providers: [...google, credentials],
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (!user.id || profile?.email_verified !== true) return false;
      await getPrisma().user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.authVersion = (await getPrisma().user.findUniqueOrThrow({
          where: { id: user.id },
          select: { authVersion: true },
        })).authVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string" &&
        typeof token.authVersion === "number"
      ) {
        session.user.id = token.userId;
        session.user.authVersion = token.authVersion;
      }
      return session;
    },
  },
});

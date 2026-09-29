import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByLogin } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    username: string;
    orgUnit?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      username: string;
      orgUnit?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username: string;
    orgUnit?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "Email ose përdoruesi", type: "text" },
        password: { label: "Fjalëkalimi", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = z
          .object({
            login: z.string().min(1).max(200),
            password: z.string().min(1).max(200),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { login, password } = parsed.data;
        const ip = clientIp(request.headers);
        const limited =
          !rateLimit(`login:ip:${ip}`, 20, 15 * 60_000).ok ||
          !rateLimit(`login:user:${login.toLowerCase()}`, 8, 15 * 60_000).ok;
        if (limited) return null;

        const user = await findUserByLogin(login);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username,
          orgUnit: user.orgUnit,
        };
      },
    }),
  ],
  pages: {
    signIn: "/hyr",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.username = user.username;
        token.orgUnit = user.orgUnit ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.orgUnit = token.orgUnit ?? null;
      }
      return session;
    },
  },
  trustHost: true,
});

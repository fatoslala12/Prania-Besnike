import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserById, findUserByLogin } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    username: string;
    orgUnit?: string | null;
    mustChangePassword: boolean;
    sessionVersion: number;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      username: string;
      orgUnit?: string | null;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username: string;
    orgUnit?: string | null;
    mustChangePassword?: boolean;
    sessionVersion?: number;
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
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
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
    /**
     * Rolet, drejtoria dhe statusi lexohen nga databaza në çdo kërkesë, që ndryshimet e
     * administratorit (ose çaktivizimi) të vlejnë menjëherë dhe jo pas 12 orësh.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.username = user.username;
        token.orgUnit = user.orgUnit ?? null;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        return token;
      }
      if (!token.id) return null;
      const fresh = await findUserById(token.id);
      if (!fresh || !fresh.active || fresh.sessionVersion !== (token.sessionVersion ?? 0)) {
        return null;
      }
      token.name = fresh.name;
      token.email = fresh.email;
      token.role = fresh.role;
      token.username = fresh.username;
      token.orgUnit = fresh.orgUnit;
      token.mustChangePassword = fresh.mustChangePassword;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.orgUnit = token.orgUnit ?? null;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  trustHost: true,
});

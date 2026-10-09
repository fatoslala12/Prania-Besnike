import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { recordAudit } from "@/lib/audit";
import { IDLE_LOGOUT_COOKIE, IDLE_TIMEOUT_LABEL, isIdleExpired } from "@/lib/idle";
import { findAnyUserByLogin, findUserById, findUserByLogin } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/types";
import { PRIMARY_ROLE_KEY, findRoleOption, roleOptions } from "@/lib/user-roles";

declare module "next-auth" {
  interface User {
    role: Role;
    username: string;
    orgUnit?: string | null;
    mustChangePassword: boolean;
    sessionVersion: number;
    roleCount: number;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      /** Roli aktiv (ai që përdoruesi zgjodhi), jo domosdoshmërisht roli kryesor. */
      role: Role;
      username: string;
      orgUnit?: string | null;
      mustChangePassword: boolean;
      roleKey: string | null;
      roleCount: number;
      /** Ka disa role dhe ende s'ka zgjedhur me cilin punon. */
      needsRole: boolean;
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
    activeRole?: string | null;
    roleCount?: number;
    /** Herën e fundit që shfletuesi raportoi veprim të përdoruesit (ms). */
    lastSeen?: number;
  }
}

async function idleLogoutRequested() {
  try {
    const jar = await cookies();
    if (jar.get(IDLE_LOGOUT_COOKIE)?.value !== "idle") return false;
    jar.delete(IDLE_LOGOUT_COOKIE);
    return true;
  } catch {
    return false;
  }
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
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

        const failed = async (reason: string, login: string | null, who?: { id: string; name: string; role: string }) => {
          await recordAudit(
            "LOGIN_FAILED",
            { success: false, reason, login, userId: who?.id, userName: who?.name, role: who?.role },
            { headers: request.headers },
          );
          return null;
        };
        if (!parsed.success) {
          const raw = (credentials as { login?: unknown } | undefined)?.login;
          return failed("INVALID_INPUT", typeof raw === "string" ? raw : null);
        }

        const { login, password } = parsed.data;
        const ip = clientIp(request.headers);
        const limited =
          !rateLimit(`login:ip:${ip}`, 20, 15 * 60_000).ok ||
          !rateLimit(`login:user:${login.toLowerCase()}`, 8, 15 * 60_000).ok;
        if (limited) return failed("RATE_LIMITED", login);

        const user = await findUserByLogin(login);
        if (!user) {
          const other = await findAnyUserByLogin(login);
          return other ? failed("INACTIVE", login, other) : failed("UNKNOWN_USER", login);
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return failed("WRONG_PASSWORD", login, user);

        const roleCount = roleOptions(user).length;
        await recordAudit(
          "LOGIN_SUCCESS",
          {
            login,
            userId: user.id,
            userName: user.name,
            role: user.role,
            details: roleCount > 1 ? `${roleCount} role — zgjedh rolin pas hyrjes` : null,
          },
          { headers: request.headers },
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username,
          orgUnit: user.orgUnit,
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
          roleCount,
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.username = user.username;
        token.orgUnit = user.orgUnit ?? null;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        token.roleCount = user.roleCount;
        token.activeRole = user.roleCount > 1 ? null : PRIMARY_ROLE_KEY;
        token.lastSeen = Date.now();
        return token;
      }
      if (!token.id) return null;
      // Rrjedh vetëm nga veprimet e përdoruesit (ping/ndërrim roli), jo nga kërkesat e sfondit.
      if (isIdleExpired(token.lastSeen)) return null;
      if (trigger === "update" || typeof token.lastSeen !== "number") token.lastSeen = Date.now();
      const fresh = await findUserById(token.id);
      if (!fresh || !fresh.active || fresh.sessionVersion !== (token.sessionVersion ?? 0)) {
        return null;
      }
      const requested = (session as { activeRole?: unknown } | undefined)?.activeRole;
      if (trigger === "update" && typeof requested === "string" && findRoleOption(fresh, requested)) {
        token.activeRole = requested;
      }
      // Roli aktiv rivlerësohet çdo herë: nëse admini e heq, përdoruesi rizgjedh.
      const options = roleOptions(fresh);
      let active = findRoleOption(fresh, token.activeRole);
      if (!active) {
        active = options.length === 1 ? options[0] : null;
        token.activeRole = active ? PRIMARY_ROLE_KEY : null;
      }
      const effective = active ?? options[0];
      token.name = fresh.name;
      token.email = fresh.email;
      token.role = effective.role;
      token.username = fresh.username;
      token.orgUnit = effective.orgUnit;
      token.mustChangePassword = fresh.mustChangePassword;
      token.roleCount = options.length;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.orgUnit = token.orgUnit ?? null;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
        session.user.roleKey = token.activeRole ?? null;
        session.user.roleCount = token.roleCount ?? 1;
        session.user.needsRole = !token.activeRole;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (!token?.id) return;
      const idle = await idleLogoutRequested();
      await recordAudit(idle ? "SESSION_TIMEOUT" : "LOGOUT", {
        userId: token.id,
        userName: token.name ?? null,
        role: token.role,
        login: token.username,
        details: idle ? `Pas ${IDLE_TIMEOUT_LABEL} pa aktivitet` : null,
      });
    },
  },
  trustHost: true,
});

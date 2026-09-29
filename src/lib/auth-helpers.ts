import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { Role } from "@/lib/types";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/hyr");
  }
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/panel");
  }
  return session;
}

export function accessOf(session: Session) {
  return {
    id: session.user.id,
    role: session.user.role,
    orgUnit: session.user.orgUnit ?? null,
  };
}

export function actorOf(session: Session) {
  return { id: session.user.id, name: session.user.name };
}

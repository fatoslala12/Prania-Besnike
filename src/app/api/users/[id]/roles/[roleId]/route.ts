import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/constants";
import { countActiveAdmins, getAnyUser, removeUserRole } from "@/lib/repo";

type Params = { params: Promise<{ id: string; roleId: string }> };

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return bad("Nuk keni të drejtë", 403);
  }
  const { id, roleId } = await params;
  const target = await getAnyUser(id);
  if (!target) return bad("Përdoruesi nuk u gjet", 404);
  const extra = target.extraRoles.find((r) => r.id === roleId);
  if (!extra) return bad("Roli nuk u gjet", 404);

  const self = id === session.user.id;
  if (self && roleId === session.user.roleKey) {
    return bad("Nuk mund ta hiqni rolin me të cilin jeni duke punuar. Ndërroni rolin fillimisht.");
  }
  if (extra.role === "ADMIN") {
    const keepsAdmin =
      target.role === "ADMIN" || target.extraRoles.some((r) => r.id !== roleId && r.role === "ADMIN");
    if (self && !keepsAdmin) {
      return bad("Nuk mund t'ia hiqni vetes rolin Super Administrator. Kërkojini një tjetri.");
    }
    if (!keepsAdmin && target.active && (await countActiveAdmins(id)) === 0) {
      return bad("Duhet të mbetet të paktën një Super Administrator aktiv.");
    }
  }

  const user = await removeUserRole(id, roleId);
  if (!user) return bad("Roli nuk u gjet", 404);
  return NextResponse.json(user);
}

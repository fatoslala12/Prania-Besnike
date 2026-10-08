import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/constants";
import { addUserRole, getAnyUser, isActiveOrgUnit } from "@/lib/repo";
import { hasRoleAssignment, roleOptions } from "@/lib/user-roles";

type Params = { params: Promise<{ id: string }> };

const MAX_ROLES = 5;

const schema = z.object({
  role: z.enum(["PERFAQESUES", "RECEPSION", "ADMINISTRATOR", "ADMIN", "MONITORUES"]),
  orgUnit: z.string().max(200).nullable(),
});

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return bad("Nuk keni të drejtë", 403);
  }
  const { id } = await params;
  const target = await getAnyUser(id);
  if (!target) return bad("Përdoruesi nuk u gjet", 404);
  if (!target.active) return bad("Aktivizojeni përdoruesin para se t'i shtoni role.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Të dhëna të pavlefshme");
  const role = parsed.data.role;
  const orgUnit = parsed.data.orgUnit || null;

  if (orgUnit && !(await isActiveOrgUnit(orgUnit))) {
    return bad("Drejtoria e zgjedhur nuk është aktive");
  }
  if (hasRoleAssignment(target, role, orgUnit)) {
    return bad("Përdoruesi e ka tashmë këtë rol me këtë drejtori.", 409);
  }
  if (roleOptions(target).length >= MAX_ROLES) {
    return bad(`Një përdorues mund të ketë deri në ${MAX_ROLES} role.`);
  }

  const user = await addUserRole(id, role, orgUnit);
  if (!user) return bad("Përdoruesi nuk u gjet", 404);
  return NextResponse.json(user, { status: 201 });
}

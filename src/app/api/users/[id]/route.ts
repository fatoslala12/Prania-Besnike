import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/constants";
import {
  countActiveAdmins,
  getAnyUser,
  isActiveOrgUnit,
  setUserActive,
  updateUser,
} from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

const activeSchema = z.object({ active: z.boolean() }).strict();

const editSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/),
  role: z.enum(["PERFAQESUES", "RECEPSION", "ADMINISTRATOR", "ADMIN", "MONITORUES"]),
  orgUnit: z.string().max(200).nullable(),
});

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return bad("Nuk keni të drejtë", 403);
  }
  const { id } = await params;
  const target = await getAnyUser(id);
  if (!target) return bad("Përdoruesi nuk u gjet", 404);
  const self = id === session.user.id;
  const body = await req.json().catch(() => null);

  const toggle = activeSchema.safeParse(body);
  if (toggle.success) {
    const { active } = toggle.data;
    if (self && !active) return bad("Nuk mund ta çaktivizoni llogarinë tuaj.");
    if (!active && target.role === "ADMIN" && (await countActiveAdmins(id)) === 0) {
      return bad("Duhet të mbetet të paktën një Super Administrator aktiv.");
    }
    return NextResponse.json(await setUserActive(id, active));
  }

  const edit = editSchema.safeParse(body);
  if (!edit.success) {
    return bad("Të dhëna të pavlefshme (emri min. 2 karaktere, email i saktë, përdoruesi pa hapësira).");
  }
  const data = edit.data;
  if (self && data.role !== target.role) {
    return bad("Nuk mund ta ndryshoni rolin tuaj. Kërkojini një Super Administratori tjetër.");
  }
  if (target.role === "ADMIN" && data.role !== "ADMIN" && (await countActiveAdmins(id)) === 0) {
    return bad("Duhet të mbetet të paktën një Super Administrator aktiv.");
  }
  const orgUnit = data.orgUnit || null;
  if (orgUnit && orgUnit !== target.orgUnit && !(await isActiveOrgUnit(orgUnit))) {
    return bad("Drejtoria e zgjedhur nuk është aktive");
  }

  try {
    const user = await updateUser(id, {
      name: data.name,
      email: data.email.toLowerCase(),
      username: data.username,
      role: data.role,
      orgUnit,
    });
    if (!user) return bad("Përdoruesi nuk u gjet", 404);
    return NextResponse.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return bad("Ky email ose emër përdoruesi përdoret nga dikush tjetër.", 409);
    }
    throw e;
  }
}

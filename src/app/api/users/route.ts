import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditActor, recordAudit } from "@/lib/audit";
import { ROLE_LABELS, canManageUsers, isManagerRole } from "@/lib/constants";
import { createUser, isActiveOrgUnit, listUsers } from "@/lib/repo";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  if (!isManagerRole(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  return NextResponse.json(await listUsers());
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(10).max(200),
  role: z.enum(["PERFAQESUES", "RECEPSION", "ADMINISTRATOR", "ADMIN", "MONITORUES"]),
  orgUnit: z.string().max(200).nullable().optional(),
  mustChangePassword: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Të dhëna të pavlefshme (fjalëkalimi min. 10 karaktere, përdoruesi pa hapësira).",
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.orgUnit && !(await isActiveOrgUnit(data.orgUnit))) {
    return NextResponse.json({ error: "Drejtoria e zgjedhur nuk është aktive" }, { status: 400 });
  }
  try {
    const user = await createUser({
      name: data.name,
      email: data.email.toLowerCase(),
      username: data.username,
      password: data.password,
      role: data.role,
      orgUnit: data.orgUnit || null,
      mustChangePassword: data.mustChangePassword ?? true,
    });
    await recordAudit("USER_CREATED", {
      ...auditActor(session),
      targetId: user.id,
      targetLabel: `${user.name} (${user.username})`,
      details: ROLE_LABELS[user.role] + (user.orgUnit ? ` · ${user.orgUnit}` : ""),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return NextResponse.json(
        { error: "Email ose përdoruesi ekziston tashmë" },
        { status: 409 },
      );
    }
    throw e;
  }
}

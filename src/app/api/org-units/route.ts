import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/constants";
import { orgUnitNameSchema } from "@/lib/org-unit-schema";
import { createOrgUnit, listOrgUnits } from "@/lib/repo";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  return NextResponse.json(await listOrgUnits());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  const parsed = z.object({ name: orgUnitNameSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Emri duhet të ketë 3–150 karaktere." }, { status: 400 });
  }
  try {
    return NextResponse.json(await createOrgUnit(parsed.data.name), { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return NextResponse.json({ error: "Ekziston tashmë një drejtori me këtë emër." }, { status: 409 });
    }
    throw e;
  }
}

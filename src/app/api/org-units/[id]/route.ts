import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditActor, recordAudit } from "@/lib/audit";
import { canManageUsers } from "@/lib/constants";
import { orgUnitNameSchema } from "@/lib/org-unit-schema";
import { listOrgUnits, renameOrgUnit, setOrgUnitActive } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.union([
  z.object({ name: orgUnitNameSchema }).strict(),
  z.object({ active: z.boolean() }).strict(),
]);

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Emri duhet të ketë 3–150 karaktere." }, { status: 400 });
  }

  try {
    const before = (await listOrgUnits()).find((u) => u.id === id);
    const unit =
      "name" in parsed.data
        ? await renameOrgUnit(id, parsed.data.name)
        : await setOrgUnitActive(id, parsed.data.active);
    if (!unit) return NextResponse.json({ error: "Drejtoria nuk u gjet" }, { status: 404 });
    if ("name" in parsed.data) {
      if (before?.name !== unit.name) {
        await recordAudit("ORG_UNIT_RENAMED", {
          ...auditActor(session),
          targetId: id,
          targetLabel: unit.name,
          details: `Emri i vjetër: ${before?.name ?? "—"}`,
        });
      }
    } else if (before?.active !== unit.active) {
      await recordAudit(unit.active ? "ORG_UNIT_ACTIVATED" : "ORG_UNIT_DEACTIVATED", {
        ...auditActor(session),
        targetId: id,
        targetLabel: unit.name,
      });
    }
    return NextResponse.json(unit);
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return NextResponse.json({ error: "Ekziston tashmë një drejtori me këtë emër." }, { status: 409 });
    }
    throw e;
  }
}

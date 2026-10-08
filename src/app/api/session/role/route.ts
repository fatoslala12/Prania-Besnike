import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, unstable_update } from "@/auth";
import { findUserById } from "@/lib/repo";
import { findRoleOption } from "@/lib/user-roles";

const schema = z.object({ key: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Të dhëna të pavlefshme" }, { status: 400 });
  }
  const user = await findUserById(session.user.id);
  const option = user ? findRoleOption(user, parsed.data.key) : null;
  if (!option) {
    return NextResponse.json({ error: "Ky rol nuk është më i juaji." }, { status: 403 });
  }
  const updated = await unstable_update({ activeRole: option.key } as never);
  if (updated?.user?.roleKey !== option.key) {
    return NextResponse.json({ error: "Roli nuk u ndërrua. Provoni sërish." }, { status: 500 });
  }
  return NextResponse.json({ role: option.role, orgUnit: option.orgUnit });
}

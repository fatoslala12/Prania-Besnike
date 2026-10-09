import { NextResponse } from "next/server";
import { auth, unstable_update } from "@/auth";

/** Shfletuesi e thërret kur përdoruesi po punon, që serveri të mos e nxjerrë për pasivitet. */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  await unstable_update({ activity: true } as never);
  return new NextResponse(null, { status: 204 });
}

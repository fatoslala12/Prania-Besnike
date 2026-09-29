import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
} from "@/lib/repo";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, 30),
    countUnreadNotifications(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

const readSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const parsed = readSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.all && !parsed.data.ids?.length)) {
    return NextResponse.json({ error: "Të dhëna të pavlefshme" }, { status: 400 });
  }
  await markNotificationsRead(session.user.id, parsed.data.all ? undefined : parsed.data.ids);
  return NextResponse.json({ ok: true });
}

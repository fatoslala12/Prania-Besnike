import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { changePassword, getUser, setEmailNotifications } from "@/lib/repo";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

const prefsSchema = z.object({ emailNotifications: z.boolean() });

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const user = await getUser(session.user.id);
  if (!user) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await req.json().catch(() => null);

  const prefs = prefsSchema.safeParse(body);
  if (prefs.success) {
    await setEmailNotifications(userId, prefs.data.emailNotifications);
    return NextResponse.json({ ok: true, emailNotifications: prefs.data.emailNotifications });
  }

  const pw = passwordSchema.safeParse(body);
  if (!pw.success) {
    return NextResponse.json(
      { error: "Fjalëkalimi i ri duhet të ketë të paktën 10 karaktere." },
      { status: 400 },
    );
  }
  if (pw.data.currentPassword === pw.data.newPassword) {
    return NextResponse.json(
      { error: "Fjalëkalimi i ri duhet të jetë i ndryshëm nga ai aktual." },
      { status: 400 },
    );
  }
  if (!rateLimit(`password:${userId}`, 5, 15 * 60_000).ok) {
    return NextResponse.json(
      { error: "Shumë tentativa. Provoni sërish pas 15 minutash." },
      { status: 429 },
    );
  }

  const result = await changePassword(userId, pw.data.currentPassword, pw.data.newPassword);
  if (result === "WRONG_PASSWORD") {
    return NextResponse.json({ error: "Fjalëkalimi aktual nuk është i saktë." }, { status: 400 });
  }
  if (result === "NOT_FOUND") {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

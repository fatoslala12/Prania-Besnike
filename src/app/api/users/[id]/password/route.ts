import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditActor, recordAudit } from "@/lib/audit";
import { MAIL_DISABLED_ERROR } from "@/lib/citizen-mail";
import { canManageUsers } from "@/lib/constants";
import { sendPasswordResetEmail, temporaryPassword } from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getAnyUser, setTemporaryPassword } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ mode: z.enum(["temporary", "email"]) });

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return bad("Nuk keni të drejtë", 403);
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Kërkesë e pavlefshme");

  const { id } = await params;
  const target = await getAnyUser(id);
  if (!target) return bad("Përdoruesi nuk u gjet", 404);
  if (id === session.user.id) {
    return bad("Fjalëkalimin tuaj e ndryshoni te «Profili im».");
  }
  if (!target.active) return bad("Aktivizojeni përdoruesin para se t'i rivendosni fjalëkalimin.");
  if (!rateLimit(`admin-reset:${session.user.id}`, 20, 10 * 60_000).ok) {
    return bad("Shumë rivendosje brenda pak minutash. Provoni më vonë.", 429);
  }

  if (parsed.data.mode === "temporary") {
    const password = temporaryPassword();
    if (!(await setTemporaryPassword(id, password))) return bad("Përdoruesi nuk u gjet", 404);
    await recordAudit("USER_PASSWORD_RESET", {
      ...auditActor(session),
      targetId: id,
      targetLabel: `${target.name} (${target.username})`,
      details: "Fjalëkalim i përkohshëm",
    });
    return NextResponse.json({ ok: true, password });
  }

  try {
    await sendPasswordResetEmail(req, target, { byAdmin: true });
  } catch (e) {
    if (e instanceof Error && e.message === "MAIL_DISABLED") return bad(MAIL_DISABLED_ERROR, 503);
    console.error("Email-i i rivendosjes dështoi", e);
    return bad("Email-i nuk u dërgua. Provoni përsëri ose përdorni fjalëkalimin e përkohshëm.", 502);
  }
  await recordAudit("USER_PASSWORD_RESET", {
    ...auditActor(session),
    targetId: id,
    targetLabel: `${target.name} (${target.username})`,
    details: `Lidhje rivendosjeje te ${target.email}`,
  });
  return NextResponse.json({ ok: true, to: target.email });
}

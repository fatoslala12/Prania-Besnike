import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/password-reset";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { findUserByLogin } from "@/lib/repo";

const schema = z.object({ login: z.string().trim().min(1).max(200) });

/** Përgjigjja është gjithmonë e njëjtë, që të mos zbulohet nëse një llogari ekziston. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Shkruani email-in ose emrin e përdoruesit." }, { status: 400 });
  }
  const login = parsed.data.login.toLowerCase();
  const ip = clientIp(req.headers);
  if (
    !rateLimit(`forgot:ip:${ip}`, 5, 15 * 60_000).ok ||
    !rateLimit(`forgot:login:${login}`, 3, 60 * 60_000).ok
  ) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni sërish pas pak minutash." },
      { status: 429 },
    );
  }

  const user = await findUserByLogin(login);
  await recordAudit("PASSWORD_RESET_REQUESTED", {
    login,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    success: !!user,
    reason: user ? null : "Llogari e panjohur ose e çaktivizuar (s'u dërgua asgjë)",
  });
  if (user?.email) {
    after(async () => {
      try {
        await sendPasswordResetEmail(req, user, { byAdmin: false });
      } catch (e) {
        console.error("Email-i i rivendosjes dështoi", e);
      }
    });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { hashResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { resetPasswordWithToken } from "@/lib/repo";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(10).max(200),
});

export async function POST(req: Request) {
  if (!rateLimit(`reset:ip:${clientIp(req.headers)}`, 10, 15 * 60_000).ok) {
    return NextResponse.json({ error: "Shumë tentativa. Provoni pas pak minutash." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Fjalëkalimi i ri duhet të ketë të paktën 10 karaktere." },
      { status: 400 },
    );
  }
  const result = await resetPasswordWithToken(hashResetToken(parsed.data.token), parsed.data.password);
  if (result === "INVALID") {
    await recordAudit("PASSWORD_RESET_DONE", { success: false, reason: "Lidhje e skaduar ose e përdorur" });
    return NextResponse.json(
      { error: "Lidhja ka skaduar ose është përdorur tashmë. Kërkoni një lidhje të re." },
      { status: 400 },
    );
  }
  await recordAudit("PASSWORD_RESET_DONE", {});
  return NextResponse.json({ ok: true });
}

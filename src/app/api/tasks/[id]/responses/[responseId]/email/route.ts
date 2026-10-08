import { NextResponse } from "next/server";
import { auditActor, recordAudit } from "@/lib/audit";
import { actorOf } from "@/lib/auth-helpers";
import { MAIL_DISABLED_ERROR, mailPdfToCitizen } from "@/lib/citizen-mail";
import { responseDate, responsePdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rate-limit";
import { getResponse, logTaskEvent, markResponseSent } from "@/lib/repo";
import { emailEvent } from "@/lib/task-events";
import { loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string; responseId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id, responseId } = await params;
  const loaded = await loadAccessibleTask(id, { write: true });
  if (loaded.error) return loaded.error;
  const { session, task } = loaded;

  const response = await getResponse(id, responseId);
  if (!response) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  if (!task.citizenEmail) {
    return NextResponse.json({ error: "Kërkuesi nuk ka dhënë adresë email-i" }, { status: 400 });
  }
  if (!rateLimit(`mail:${session.user.id}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Shumë dërgime. Provoni pas pak minutash." }, { status: 429 });
  }

  const sentAt = response.sentAt ? new Date(response.sentAt) : new Date();
  const letter = { ...response, sentAt: sentAt.toISOString() };
  try {
    await mailPdfToCitizen({
      to: task.citizenEmail,
      citizenName: task.citizenName,
      subject: `Përgjigje për kërkesën tuaj Nr. ${task.number}`,
      intro: `Në vijim të kërkesës suaj Nr. ${task.number}, ${response.orgUnit} ju përcjell përgjigjen zyrtare Nr. ${response.number}, datë ${responseDate(letter)}.`,
      filename: `${response.number}.pdf`,
      pdf: await responsePdf(task, letter),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "MAIL_DISABLED") {
      return NextResponse.json({ error: MAIL_DISABLED_ERROR }, { status: 503 });
    }
    console.error("Email i përgjigjes dështoi", e);
    return NextResponse.json({ error: "Emaili nuk u dërgua. Provoni përsëri." }, { status: 502 });
  }

  const sent = await markResponseSent(id, responseId, task.citizenEmail, sentAt);
  await logTaskEvent(task.id, emailEvent(response.number, task.citizenEmail, "përgjigjes"), actorOf(session));
  await recordAudit("RESPONSE_SENT", {
    ...auditActor(session),
    targetId: task.id,
    targetLabel: `${response.number} · ${task.title}`,
    details: `Te ${task.citizenEmail}`,
  });
  return NextResponse.json({ ok: true, to: task.citizenEmail, response: sent ?? letter });
}

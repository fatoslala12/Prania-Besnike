import { format } from "date-fns";
import { NextResponse } from "next/server";
import { actorOf } from "@/lib/auth-helpers";
import { MAIL_DISABLED_ERROR, mailPdfToCitizen } from "@/lib/citizen-mail";
import { requestPdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rate-limit";
import { logTaskEvent } from "@/lib/repo";
import { emailEvent } from "@/lib/task-events";
import { loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const loaded = await loadAccessibleTask((await params).id, { write: true });
  if (loaded.error) return loaded.error;
  const { session, task } = loaded;

  if (!task.citizenEmail) {
    return NextResponse.json({ error: "Kërkuesi nuk ka dhënë adresë email-i" }, { status: 400 });
  }
  if (!rateLimit(`mail:${session.user.id}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Shumë dërgime. Provoni pas pak minutash." }, { status: 429 });
  }

  try {
    await mailPdfToCitizen({
      to: task.citizenEmail,
      citizenName: task.citizenName,
      subject: `Konfirmim i regjistrimit të kërkesës Nr. ${task.number}`,
      intro: `Kërkesa juaj është regjistruar në Ministrinë e Shëndetësisë dhe Mirëqenies Sociale me numrin ${task.number}, më ${format(new Date(task.createdAt), "dd.MM.yyyy")}. Ju lutemi ta ruani këtë numër për çdo komunikim të mëtejshëm.`,
      filename: `${task.number}.pdf`,
      pdf: await requestPdf(task),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "MAIL_DISABLED") {
      return NextResponse.json({ error: MAIL_DISABLED_ERROR }, { status: 503 });
    }
    console.error("Email i kërkesës dështoi", e);
    return NextResponse.json({ error: "Emaili nuk u dërgua. Provoni përsëri." }, { status: 502 });
  }

  await logTaskEvent(task.id, emailEvent(task.number, task.citizenEmail, "kërkesës"), actorOf(session));
  return NextResponse.json({ ok: true, to: task.citizenEmail });
}

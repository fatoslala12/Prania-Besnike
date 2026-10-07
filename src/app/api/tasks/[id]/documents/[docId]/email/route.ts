import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { actorOf } from "@/lib/auth-helpers";
import { MAIL_DISABLED_ERROR, mailToCitizen } from "@/lib/citizen-mail";
import { rateLimit } from "@/lib/rate-limit";
import { getDocument, logTaskEvent, markDocumentSent, uploadsRoot } from "@/lib/repo";
import { documentEmailEvent } from "@/lib/task-events";
import { loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string; docId: string }> };

const bodySchema = z.object({ note: z.string().trim().max(3000).nullish() });

export async function POST(req: Request, { params }: Params) {
  const { id, docId } = await params;
  const loaded = await loadAccessibleTask(id);
  if (loaded.error) return loaded.error;
  const { session, task } = loaded;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mesazhi është shumë i gjatë (max 3000 karaktere)." }, { status: 400 });
  }
  const doc = await getDocument(id, docId);
  if (!doc) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  if (!task.citizenEmail) {
    return NextResponse.json({ error: "Kërkuesi nuk ka dhënë adresë email-i" }, { status: 400 });
  }
  if (!rateLimit(`mail:${session.user.id}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Shumë dërgime. Provoni pas pak minutash." }, { status: 429 });
  }

  let content: Buffer;
  try {
    content = await readFile(
      path.join(/* turbopackIgnore: true */ uploadsRoot(), doc.taskId, path.basename(doc.filename)),
    );
  } catch {
    return NextResponse.json({ error: "Skedari nuk u gjet në server." }, { status: 404 });
  }

  try {
    await mailToCitizen({
      to: task.citizenEmail,
      citizenName: task.citizenName,
      subject: `Dokument për kërkesën tuaj Nr. ${task.number}`,
      intro: `Në vijim të kërkesës suaj Nr. ${task.number}, ju përcjellim dokumentin «${doc.originalName}».`,
      note: parsed.data.note,
      attachment: { filename: doc.originalName, content, contentType: doc.mimeType },
      attachmentLabel: "Dokumenti",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "MAIL_DISABLED") {
      return NextResponse.json({ error: MAIL_DISABLED_ERROR }, { status: 503 });
    }
    console.error("Email i dokumentit dështoi", e);
    return NextResponse.json({ error: "Emaili nuk u dërgua. Provoni përsëri." }, { status: 502 });
  }

  const sent = await markDocumentSent(id, docId, task.citizenEmail, new Date());
  await logTaskEvent(task.id, documentEmailEvent(doc.originalName, task.citizenEmail), actorOf(session));
  return NextResponse.json({ ok: true, to: task.citizenEmail, document: sent });
}

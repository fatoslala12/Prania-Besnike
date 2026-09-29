import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { accessOf } from "@/lib/auth-helpers";
import { canAccessTask } from "@/lib/constants";
import { getDocument, getTask, uploadsRoot } from "@/lib/repo";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  const { id, docId } = await params;
  const [task, doc] = await Promise.all([getTask(id), getDocument(id, docId)]);
  if (!task || !doc) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  if (!canAccessTask(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const data = await readFile(
    path.join(/* turbopackIgnore: true */ uploadsRoot(), doc.taskId, path.basename(doc.filename)),
  );
  return new NextResponse(data, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

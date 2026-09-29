import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canAccessTask } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { addDocument, getTask, uploadsRoot } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 15 * 1024 * 1024;
const ALLOWED: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  const { id } = await params;
  const task = await getTask(id);
  if (!task) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  if (!canAccessTask(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Skedari mungon" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Skedari është më i madh se 15MB" },
      { status: 400 },
    );
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED[file.type]?.includes(ext)) {
    return NextResponse.json(
      { error: "Lloji i skedarit nuk lejohet" },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(uploadsRoot(), id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const doc = await addDocument(
    {
      filename,
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      path: `${id}/${filename}`,
      taskId: id,
      uploadedById: session.user.id,
    },
    actorOf(session),
  );
  await notifyTaskChange(
    { kind: "DOCUMENT_UPLOADED", task, fileName: doc.originalName },
    actorOf(session),
  );
  return NextResponse.json(doc, { status: 201 });
}

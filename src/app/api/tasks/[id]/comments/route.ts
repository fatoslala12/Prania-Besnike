import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canAccessTask } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { addComment, getTask } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = z
    .object({ content: z.string().trim().min(1).max(5000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Komenti është bosh" }, { status: 400 });
  }

  const task = await getTask(id);
  if (!task) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  if (!canAccessTask(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const actor = actorOf(session);
  const comment = await addComment(id, actor, parsed.data.content);
  await notifyTaskChange({ kind: "COMMENT_ADDED", task, content: parsed.data.content }, actor);
  return NextResponse.json(comment, { status: 201 });
}

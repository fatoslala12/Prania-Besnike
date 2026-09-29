import { NextResponse } from "next/server";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canRespond } from "@/lib/constants";
import { getResponse, updateResponse } from "@/lib/repo";
import { responseSchema } from "@/lib/response-schema";
import { applyResponseStatus, loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string; responseId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, responseId } = await params;
  const loaded = await loadAccessibleTask(id);
  if (loaded.error) return loaded.error;
  const { session, task } = loaded;

  if (!canRespond(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  const existing = await getResponse(id, responseId);
  if (!existing) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  if (existing.sentAt) {
    return NextResponse.json(
      { error: "Përgjigjja është dërguar te kërkuesi dhe nuk mund të ndryshohet" },
      { status: 409 },
    );
  }

  const parsed = responseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Përgjigjja duhet të ketë të paktën 10 karaktere" },
      { status: 400 },
    );
  }

  const actor = actorOf(session);
  const response = await updateResponse(id, responseId, parsed.data, actor);
  if (!response) {
    return NextResponse.json(
      { error: "Përgjigjja është dërguar te kërkuesi dhe nuk mund të ndryshohet" },
      { status: 409 },
    );
  }

  const updated =
    response.isFinal !== existing.isFinal
      ? await applyResponseStatus(task, response.isFinal, actor)
      : task;
  return NextResponse.json({ response, status: updated.status });
}

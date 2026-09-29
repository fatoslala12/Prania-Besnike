import { NextResponse } from "next/server";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canRespond } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { addResponse } from "@/lib/repo";
import { responseSchema } from "@/lib/response-schema";
import { applyResponseStatus, loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const loaded = await loadAccessibleTask((await params).id);
  if (loaded.error) return loaded.error;
  const { session, task } = loaded;

  if (!task.orgUnit) {
    return NextResponse.json(
      { error: "Kërkesa nuk është deleguar ende te asnjë drejtori" },
      { status: 400 },
    );
  }
  if (!canRespond(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë të lëshoni përgjigje" }, { status: 403 });
  }
  if (task.status === "PERFUNDUAR") {
    return NextResponse.json(
      { error: "Kërkesa është mbyllur. Rihapeni (statusi «Në proces») për të shtuar një përgjigje të re." },
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
  const response = await addResponse(task.id, { ...parsed.data, orgUnit: task.orgUnit }, actor);
  if (!response) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });

  await notifyTaskChange(
    { kind: "RESPONSE_ADDED", task, number: response.number, orgUnit: response.orgUnit },
    actor,
  );
  const updated = await applyResponseStatus(task, response.isFinal, actor);
  return NextResponse.json({ response, status: updated.status }, { status: 201 });
}

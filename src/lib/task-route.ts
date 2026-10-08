import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { accessOf } from "@/lib/auth-helpers";
import { canAccessTask, isReadOnlyRole } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { getTask, updateTask } from "@/lib/repo";
import type { Actor, TaskRecord } from "@/lib/types";

type Loaded = { session: Session; task: TaskRecord; error?: never } | { error: NextResponse };

/** Për çdo endpoint që ndryshon diçka: monitoruesi ka vetëm të drejtë shikimi. */
export function readOnlyError(session: Session) {
  return isReadOnlyRole(session.user.role)
    ? NextResponse.json({ error: "Keni vetëm të drejtë shikimi." }, { status: 403 })
    : null;
}

export async function loadAccessibleTask(id: string, opts: { write?: boolean } = {}): Promise<Loaded> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Pa autorizim" }, { status: 401 }) };
  }
  const denied = opts.write ? readOnlyError(session) : null;
  if (denied) return { error: denied };
  const task = await getTask(id);
  if (!task) return { error: NextResponse.json({ error: "Nuk u gjet" }, { status: 404 }) };
  if (!canAccessTask(accessOf(session), task)) {
    return { error: NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 }) };
  }
  return { session, task };
}

/** Përgjigjja përfundimtare e mbyll kërkesën; ajo e pjesshme e mban (ose e rihap) në proces. */
export async function applyResponseStatus(task: TaskRecord, isFinal: boolean, actor: Actor) {
  const status = isFinal ? "PERFUNDUAR" : "NE_PROCES";
  if (task.status === status) return task;
  const updated = await updateTask(task.id, { status }, actor);
  if (!updated) return task;
  await notifyTaskChange({ kind: "STATUS_CHANGED", task: updated, from: task.status }, actor);
  return updated;
}

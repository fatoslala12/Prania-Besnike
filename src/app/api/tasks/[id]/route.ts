import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canAccessTask, canAssignTask, canRedelegate } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { readOnlyError } from "@/lib/task-route";
import {
  addComment,
  deleteTask,
  getTask,
  getTaskDetail,
  isActiveOrgUnit,
  updateTask,
} from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  if (!canAccessTask(accessOf(session), task)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  return NextResponse.json(task);
}

const updateSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(3).max(10000).optional(),
  status: z.enum(["I_RI", "NE_PROCES", "PERFUNDUAR", "BLOKUAR"]).optional(),
  assigneeId: z.string().nullable().optional(),
  orgUnit: z.string().min(1).max(200).nullable().optional(),
  comment: z.string().trim().max(5000).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  const denied = readOnlyError(session);
  if (denied) return denied;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Të dhëna të pavlefshme" }, { status: 400 });
  }

  const { comment, ...patch } = parsed.data;
  const role = session.user.role;
  const managerOnly =
    patch.assigneeId !== undefined ||
    patch.title !== undefined ||
    patch.description !== undefined;
  if (managerOnly && !canAssignTask(role)) {
    return NextResponse.json(
      { error: "Mund të ndryshoni vetëm statusin ose të ri-delegoni" },
      { status: 403 },
    );
  }
  if (patch.orgUnit !== undefined) {
    if (!canRedelegate(role) || (patch.orgUnit === null && !canAssignTask(role))) {
      return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
    }
  }

  const existing = await getTask(id);
  if (!existing) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  if (!canAccessTask(accessOf(session), existing)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }
  if (
    existing.status === "PERFUNDUAR" &&
    (managerOnly || patch.orgUnit !== undefined || patch.status === "PERFUNDUAR")
  ) {
    return NextResponse.json(
      { error: "Çështja është e mbyllur. Rihapeni që ta ri-delegoni ose ndryshoni." },
      { status: 409 },
    );
  }
  if (
    patch.orgUnit &&
    patch.orgUnit !== existing.orgUnit &&
    !(await isActiveOrgUnit(patch.orgUnit))
  ) {
    return NextResponse.json({ error: "Drejtoria e zgjedhur nuk është aktive" }, { status: 400 });
  }

  const actor = actorOf(session);
  const task = await updateTask(id, patch, actor);
  if (!task) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }

  const redelegated = patch.orgUnit !== undefined && patch.orgUnit !== existing.orgUnit;
  if (comment) {
    await addComment(
      id,
      actor,
      redelegated ? `Ri-delegim → ${task.orgUnit ?? "pa delegim"}: ${comment}` : comment,
    );
  }

  if (redelegated) {
    await notifyTaskChange(
      { kind: "TASK_DELEGATED", task, fromOrgUnit: existing.orgUnit, note: comment },
      actor,
    );
  } else if (comment) {
    await notifyTaskChange({ kind: "COMMENT_ADDED", task, content: comment }, actor);
  }
  if (patch.status !== undefined && patch.status !== existing.status) {
    await notifyTaskChange({ kind: "STATUS_CHANGED", task, from: existing.status }, actor);
  }

  return NextResponse.json({
    ...task,
    stillHasAccess: canAccessTask(accessOf(session), task),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Vetëm admin" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await getTask(id))) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}

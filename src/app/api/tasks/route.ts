import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { accessOf, actorOf } from "@/lib/auth-helpers";
import { canCreateTask, canSeeAllTasks } from "@/lib/constants";
import { notifyTaskChange } from "@/lib/notify";
import { createTask, isActiveOrgUnit, listTasks } from "@/lib/repo";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }

  const tasks = await listTasks(
    canSeeAllTasks(session.user) ? {} : { access: accessOf(session) },
  );
  return NextResponse.json(tasks);
}

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(10000),
  orgUnit: z.string().min(1).max(200),
  citizenName: z.string().trim().max(120).nullish(),
  citizenPhone: z.string().trim().max(40).nullish(),
  citizenEmail: z.string().trim().email().max(200).nullish().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  if (!canCreateTask(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Të dhëna të pavlefshme" }, { status: 400 });
  }

  const data = parsed.data;
  if (!(await isActiveOrgUnit(data.orgUnit))) {
    return NextResponse.json({ error: "Drejtoria e zgjedhur nuk është aktive" }, { status: 400 });
  }
  const actor = actorOf(session);
  const task = await createTask(
    {
      title: data.title,
      description: data.description,
      orgUnit: data.orgUnit,
      assigneeId: null,
      citizenName: data.citizenName || null,
      citizenPhone: data.citizenPhone || null,
      citizenEmail: data.citizenEmail || null,
      requestDate: null,
      isCitizenRequest: false,
      creatorId: session.user.id,
    },
    actor,
  );
  await notifyTaskChange({ kind: "TASK_NEW", task }, actor);
  return NextResponse.json(task, { status: 201 });
}

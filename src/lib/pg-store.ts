import bcrypt from "bcryptjs";
import { Prisma, type TaskEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";
import {
  commentEvent,
  createdEvents,
  documentEvent,
  eventTimes,
  responseEvent,
  responseNumber,
  responseUpdatedEvent,
  updateEvents,
  type EventDraft,
} from "@/lib/task-events";
import type {
  Actor,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
  EventMeta,
  HistoryView,
  NewNotification,
  NewTaskInput,
  NotificationKind,
  NotificationView,
  ReportData,
  ResponseInput,
  ResponseView,
  Role,
  TaskDetailView,
  TaskFilter,
  TaskListItem,
  TaskPatch,
  TaskRecord,
  UserView,
} from "@/lib/types";

type TaskRow = Prisma.TaskGetPayload<object>;

function toTaskRecord(t: TaskRow): TaskRecord {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    orgUnit: t.orgUnit,
    citizenName: t.citizenName,
    citizenEmail: t.citizenEmail,
    citizenPhone: t.citizenPhone,
    requestDate: t.requestDate?.toISOString() ?? null,
    isCitizenRequest: t.isCitizenRequest,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    creatorId: t.creatorId,
    assigneeId: t.assigneeId,
  };
}

function toHistory(
  e: TaskEvent & { actor: { role: Role } | null },
): HistoryView {
  const meta = (e.meta ?? undefined) as EventMeta | undefined;
  return {
    id: e.id,
    taskId: e.taskId,
    type: e.type,
    message: e.message,
    actorId: e.actorId,
    actorName: e.actorName,
    actorRole: e.actor?.role ?? ((meta?.actorRole as Role | undefined) || null),
    meta,
    createdAt: e.createdAt.toISOString(),
  };
}

type ResponseRow = Prisma.TaskResponseGetPayload<object>;

function toResponseView(r: ResponseRow, taskNumber: string): ResponseView {
  return {
    id: r.id,
    taskId: r.taskId,
    seq: r.seq,
    number: responseNumber(taskNumber, r.seq),
    content: r.content,
    orgUnit: r.orgUnit,
    isFinal: r.isFinal,
    authorId: r.authorId,
    authorName: r.authorName,
    sentAt: r.sentAt?.toISOString() ?? null,
    sentTo: r.sentTo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function eventRows(taskId: string, drafts: EventDraft[], actor: Actor) {
  const times = eventTimes(drafts.length);
  return drafts.map((d, i) => ({
    taskId,
    type: d.type,
    message: d.message,
    meta: (d.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    actorId: actor.id,
    actorName: actor.name,
    createdAt: times[i],
  }));
}

function accessWhere(access?: { id: string; orgUnit?: string | null }): Prisma.TaskWhereInput {
  if (!access) return {};
  return {
    OR: [
      { assigneeId: access.id },
      ...(access.orgUnit ? [{ orgUnit: access.orgUnit }] : []),
    ],
  };
}

async function userName(id: string | null) {
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return u?.name ?? null;
}

export async function findUserByLogin(login: string): Promise<AuthUser | null> {
  const u = await prisma.user.findFirst({
    where: {
      active: true,
      OR: [
        { email: { equals: login.trim(), mode: "insensitive" } },
        { username: { equals: login.trim(), mode: "insensitive" } },
      ],
    },
  });
  return u
    ? {
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        orgUnit: u.orgUnit,
        active: u.active,
      }
    : null;
}

export async function listUsers(): Promise<UserView[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    orgUnit: u.orgUnit,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  orgUnit: string | null;
}): Promise<UserView> {
  try {
    const u = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        username: input.username,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: input.role,
        orgUnit: input.orgUnit,
      },
    });
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      orgUnit: u.orgUnit,
      createdAt: u.createdAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("EXISTS");
    }
    throw e;
  }
}

export async function getTask(id: string): Promise<TaskRecord | null> {
  const t = await prisma.task.findUnique({ where: { id } });
  return t ? toTaskRecord(t) : null;
}

export async function listTasks(filter: TaskFilter = {}): Promise<TaskListItem[]> {
  const and: Prisma.TaskWhereInput[] = [accessWhere(filter.access)];
  if (filter.orgUnit) and.push({ orgUnit: filter.orgUnit });
  if (filter.status) and.push({ status: filter.status });
  if (filter.q) {
    const contains = { contains: filter.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        { citizenName: contains },
        { number: contains },
        { orgUnit: contains },
      ],
    });
  }
  const rows = await prisma.task.findMany({
    where: { AND: and },
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
    },
  });
  return rows.map((t) => ({
    ...toTaskRecord(t),
    assignee: t.assignee,
    documentsCount: t._count.documents,
  }));
}

export async function getTaskDetail(id: string): Promise<TaskDetailView | null> {
  const t = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
      creator: { select: { id: true, name: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
      responses: { orderBy: { seq: "asc" } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { role: true } } },
      },
    },
  });
  if (!t) return null;
  return {
    ...toTaskRecord(t),
    assignee: t.assignee,
    creator: t.creator,
    documents: t.documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    comments: t.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    responses: t.responses.map((r) => toResponseView(r, t.number)),
    history: t.events.map(toHistory),
  };
}

export async function createTask(input: NewTaskInput, actor: Actor): Promise<TaskRecord> {
  const assigneeName = await userName(input.assigneeId);
  const year = new Date().getFullYear();

  const task = await prisma.$transaction(async (tx) => {
    const counter = await tx.taskCounter.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });
    const number = `PB-${year}-${String(counter.value).padStart(4, "0")}`;
    const created = await tx.task.create({
      data: {
        number,
        title: input.title,
        description: input.description,
        orgUnit: input.orgUnit,
        assigneeId: input.assigneeId,
        citizenName: input.citizenName,
        citizenEmail: input.citizenEmail,
        citizenPhone: input.citizenPhone,
        requestDate: input.requestDate ? new Date(input.requestDate) : null,
        isCitizenRequest: input.isCitizenRequest,
        creatorId: input.creatorId,
      },
    });
    await tx.taskEvent.createMany({
      data: eventRows(created.id, createdEvents(toTaskRecord(created), assigneeName), actor),
    });
    return created;
  });

  return toTaskRecord(task);
}

export async function updateTask(
  id: string,
  patch: TaskPatch,
  actor: Actor,
): Promise<TaskRecord | null> {
  const prevRow = await prisma.task.findUnique({ where: { id } });
  if (!prevRow) return null;
  const prev = toTaskRecord(prevRow);

  const [actorUser, prevAssigneeName, nextAssigneeName] = await Promise.all([
    actor.id
      ? prisma.user.findUnique({ where: { id: actor.id }, select: { role: true } })
      : null,
    userName(prev.assigneeId),
    patch.assigneeId ? userName(patch.assigneeId) : null,
  ]);

  const drafts = updateEvents(prev, patch, {
    actorName: actor.name,
    actorRole: actorUser?.role ?? null,
    prevAssigneeName,
    nextAssigneeName,
  });

  const [updated] = await prisma.$transaction([
    prisma.task.update({ where: { id }, data: patch }),
    prisma.taskEvent.createMany({ data: eventRows(id, drafts, actor) }),
  ]);
  return toTaskRecord(updated);
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
}

export async function addComment(
  taskId: string,
  author: Actor & { id: string },
  content: string,
): Promise<CommentView> {
  const [comment] = await prisma.$transaction([
    prisma.taskComment.create({
      data: { taskId, authorId: author.id, content },
      include: { author: { select: { name: true, role: true } } },
    }),
    prisma.taskEvent.createMany({
      data: eventRows(taskId, [commentEvent(content)], author),
    }),
  ]);
  return { ...comment, createdAt: comment.createdAt.toISOString() };
}

export async function addDocument(
  doc: Omit<DocumentRecord, "id" | "createdAt">,
  uploader: Actor & { id: string },
): Promise<DocumentRecord> {
  const [created] = await prisma.$transaction([
    prisma.document.create({ data: doc }),
    prisma.taskEvent.createMany({
      data: eventRows(doc.taskId, [documentEvent(doc.originalName)], uploader),
    }),
  ]);
  return { ...created, createdAt: created.createdAt.toISOString() };
}

export async function getDocument(
  taskId: string,
  docId: string,
): Promise<DocumentRecord | null> {
  const d = await prisma.document.findFirst({ where: { id: docId, taskId } });
  return d ? { ...d, createdAt: d.createdAt.toISOString() } : null;
}

export async function addResponse(
  taskId: string,
  input: ResponseInput & { orgUnit: string },
  author: Actor,
): Promise<ResponseView | null> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { number: true } });
  if (!task) return null;
  for (let attempt = 0; ; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const last = await tx.taskResponse.aggregate({ where: { taskId }, _max: { seq: true } });
        const seq = (last._max.seq ?? 0) + 1;
        const row = await tx.taskResponse.create({
          data: {
            taskId,
            seq,
            content: input.content,
            orgUnit: input.orgUnit,
            isFinal: input.isFinal,
            authorId: author.id,
            authorName: author.name,
          },
        });
        await tx.taskEvent.createMany({
          data: eventRows(
            taskId,
            [responseEvent(responseNumber(task.number, seq), input.orgUnit, input.isFinal)],
            author,
          ),
        });
        return row;
      });
      return toResponseView(created, task.number);
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!clash || attempt >= 4) throw e;
    }
  }
}

export async function getResponse(
  taskId: string,
  responseId: string,
): Promise<ResponseView | null> {
  const r = await prisma.taskResponse.findFirst({
    where: { id: responseId, taskId },
    include: { task: { select: { number: true } } },
  });
  return r ? toResponseView(r, r.task.number) : null;
}

/** Kthen null nëse përgjigjja nuk ekziston ose është dërguar tashmë (e kyçur). */
export async function updateResponse(
  taskId: string,
  responseId: string,
  input: ResponseInput,
  actor: Actor,
): Promise<ResponseView | null> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.taskResponse.updateMany({
      where: { id: responseId, taskId, sentAt: null },
      data: { content: input.content, isFinal: input.isFinal },
    });
    if (locked.count === 0) return null;
    const r = await tx.taskResponse.findUniqueOrThrow({
      where: { id: responseId },
      include: { task: { select: { number: true } } },
    });
    const view = toResponseView(r, r.task.number);
    await tx.taskEvent.createMany({
      data: eventRows(taskId, [responseUpdatedEvent(view.number, view.isFinal)], actor),
    });
    return view;
  });
}

export async function markResponseSent(
  taskId: string,
  responseId: string,
  to: string,
  sentAt: Date,
): Promise<ResponseView | null> {
  const current = await prisma.taskResponse.findFirst({ where: { id: responseId, taskId } });
  if (!current) return null;
  if (!current.sentAt) {
    // updatedAt mban datën e ndryshimit të fundit të përmbajtjes, jo të dërgimit.
    await prisma.taskResponse.updateMany({
      where: { id: responseId, taskId, sentAt: null },
      data: { sentAt, sentTo: to, updatedAt: current.updatedAt },
    });
  }
  return getResponse(taskId, responseId);
}

export async function logTaskEvent(taskId: string, draft: EventDraft, actor: Actor) {
  await prisma.taskEvent.createMany({ data: eventRows(taskId, [draft], actor) });
}

export async function getDashboardStats(
  access?: { id: string; orgUnit?: string | null },
): Promise<DashboardStats> {
  const where = accessWhere(access);
  const [tasks, users, docs, events] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        status: true,
        orgUnit: true,
        assigneeId: true,
        isCitizenRequest: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, active: true } }),
    prisma.document.findMany({
      where: { task: where },
      distinct: ["taskId"],
      select: { taskId: true },
    }),
    prisma.taskEvent.findMany({
      where: { task: where },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { role: true } }, task: { select: { title: true } } },
    }),
  ]);

  return computeStats(
    tasks.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    {
      docTaskIds: new Set(docs.map((d) => d.taskId)),
      userNames: new Map(users.map((u) => [u.id, u.name])),
      recentEvents: events.map((e) => ({ ...toHistory(e), taskTitle: e.task.title })),
      usersCount: users.filter((u) => u.active).length,
    },
  );
}

export async function createNotifications(items: NewNotification[]) {
  if (items.length === 0) return;
  await prisma.notification.createMany({ data: items });
}

export async function listNotifications(
  userId: string,
  limit: number,
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((n) => ({
    ...n,
    kind: n.kind as NotificationKind,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}

export async function getReportData(range: { from: Date; to: Date }): Promise<ReportData> {
  const createdAt = { gte: range.from, lte: range.to };
  const [tasks, events] = await Promise.all([
    prisma.task.findMany({
      where: { createdAt },
      include: {
        creator: { select: { name: true } },
        _count: { select: { comments: true, documents: true } },
        events: {
          where: { type: "STATUS_CHANGED" },
          select: { meta: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.taskEvent.findMany({
      where: { createdAt },
      select: {
        taskId: true,
        type: true,
        actorId: true,
        actorName: true,
        createdAt: true,
        task: { select: { orgUnit: true } },
      },
    }),
  ]);

  return {
    tasks: tasks.map((t) => {
      const done =
        t.status === "PERFUNDUAR"
          ? t.events.filter((e) => (e.meta as EventMeta | null)?.to === "PERFUNDUAR").pop()
          : undefined;
      return {
        ...toTaskRecord(t),
        creatorName: t.creator?.name ?? null,
        completedAt: done?.createdAt.toISOString() ?? null,
        commentsCount: t._count.comments,
        documentsCount: t._count.documents,
      };
    }),
    events: events.map((e) => ({
      taskId: e.taskId,
      orgUnit: e.task.orgUnit,
      type: e.type,
      actorId: e.actorId,
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

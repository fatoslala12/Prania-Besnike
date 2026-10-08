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
  AuditEntry,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
  EventMeta,
  ExtraRole,
  HistoryView,
  NewAuditEntry,
  NewDocumentInput,
  NewNotification,
  NewTaskInput,
  NotificationKind,
  NotificationStat,
  NotificationView,
  OrgUnitUsage,
  OrgUnitView,
  PasswordChangeResult,
  ReportData,
  ResponseInput,
  ResponseView,
  Role,
  TaskDetailView,
  TaskFilter,
  TaskListItem,
  TaskPatch,
  TaskRecord,
  UserPatch,
  UserView,
} from "@/lib/types";

type TaskRow = Prisma.TaskGetPayload<object>;
type DocumentRow = Prisma.DocumentGetPayload<object>;

function toDocumentRecord(d: DocumentRow): DocumentRecord {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    sentAt: d.sentAt?.toISOString() ?? null,
  };
}

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

const withRoles = { extraRoles: { orderBy: { createdAt: "asc" } } } satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof withRoles }>;

function toExtraRoles(u: UserRow): ExtraRole[] {
  return u.extraRoles.map((r) => ({ id: r.id, role: r.role, orgUnit: r.orgUnit }));
}

function toAuthUser(u: UserRow): AuthUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    passwordHash: u.passwordHash,
    role: u.role,
    orgUnit: u.orgUnit,
    extraRoles: toExtraRoles(u),
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    sessionVersion: u.sessionVersion,
  };
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
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
    include: withRoles,
  });
  return u ? toAuthUser(u) : null;
}

/** Për regjistrin e hyrjeve: dallon "llogari e çaktivizuar" nga "përdorues i panjohur". */
export async function findAnyUserByLogin(login: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: login.trim(), mode: "insensitive" } },
        { username: { equals: login.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, role: true, active: true },
  });
}

/** Edhe përdoruesit joaktivë — që seanca e tyre të mbyllet. */
export async function findUserById(id: string): Promise<AuthUser | null> {
  const u = await prisma.user.findUnique({ where: { id }, include: withRoles });
  return u ? toAuthUser(u) : null;
}

function toUserView(u: UserRow): UserView {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    orgUnit: u.orgUnit,
    extraRoles: toExtraRoles(u),
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    emailNotifications: u.emailNotifications,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function listUsers(): Promise<UserView[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: withRoles,
  });
  return users.map(toUserView);
}

export async function listAllUsers(): Promise<UserView[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: withRoles,
  });
  return users.map(toUserView);
}

export async function getUser(id: string): Promise<UserView | null> {
  const u = await prisma.user.findFirst({ where: { id, active: true }, include: withRoles });
  return u ? toUserView(u) : null;
}

export async function getAnyUser(id: string): Promise<UserView | null> {
  const u = await prisma.user.findUnique({ where: { id }, include: withRoles });
  return u ? toUserView(u) : null;
}

export async function addUserRole(
  userId: string,
  role: Role,
  orgUnit: string | null,
): Promise<UserView | null> {
  const found = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!found) return null;
  await prisma.userRole.create({ data: { userId, role, orgUnit } });
  return getAnyUser(userId);
}

export async function removeUserRole(userId: string, roleId: string): Promise<UserView | null> {
  const { count } = await prisma.userRole.deleteMany({ where: { id: roleId, userId } });
  if (count === 0) return null;
  return getAnyUser(userId);
}

export async function changePassword(
  id: string,
  current: string,
  next: string,
): Promise<PasswordChangeResult> {
  const u = await prisma.user.findFirst({ where: { id, active: true } });
  if (!u) return "NOT_FOUND";
  if (!(await bcrypt.compare(current, u.passwordHash))) return "WRONG_PASSWORD";
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
  });
  return "OK";
}

export async function setEmailNotifications(id: string, enabled: boolean) {
  await prisma.user.update({ where: { id }, data: { emailNotifications: enabled } });
}

export async function createUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  orgUnit: string | null;
  mustChangePassword?: boolean;
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
        mustChangePassword: input.mustChangePassword ?? false,
      },
      include: withRoles,
    });
    return toUserView(u);
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("EXISTS");
    throw e;
  }
}

export async function updateUser(id: string, patch: UserPatch): Promise<UserView | null> {
  try {
    const u = await prisma.user.update({ where: { id }, data: patch, include: withRoles });
    return toUserView(u);
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("EXISTS");
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return null;
    throw e;
  }
}

export async function setUserActive(id: string, active: boolean): Promise<UserView | null> {
  const found = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!found) return null;
  const u = await prisma.user.update({
    where: { id },
    data: { active, ...(active ? {} : { sessionVersion: { increment: 1 } }) },
    include: withRoles,
  });
  return toUserView(u);
}

export async function setTemporaryPassword(id: string, password: string): Promise<boolean> {
  const found = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!found) return false;
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
  ]);
  return true;
}

export async function countActiveAdmins(excludeId?: string) {
  return prisma.user.count({
    where: {
      active: true,
      OR: [{ role: "ADMIN" }, { extraRoles: { some: { role: "ADMIN" } } }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] },
    }),
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
  ]);
}

export async function isPasswordResetTokenValid(tokenHash: string) {
  const t = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { active: true } } },
  });
  return !!t && !t.usedAt && t.expiresAt > new Date() && t.user.active;
}

export async function resetPasswordWithToken(
  tokenHash: string,
  password: string,
): Promise<"OK" | "INVALID"> {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now }, user: { active: true } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return "INVALID";
    const t = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
    await tx.user.update({
      where: { id: t.userId },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: t.userId, id: { not: t.id } } });
    return "OK";
  });
}

function toOrgUnitView(o: Prisma.OrgUnitGetPayload<object>): OrgUnitView {
  return { id: o.id, name: o.name, active: o.active, createdAt: o.createdAt.toISOString() };
}

export async function listOrgUnits(): Promise<OrgUnitView[]> {
  return (await prisma.orgUnit.findMany()).map(toOrgUnitView);
}

export async function orgUnitUsage(): Promise<Record<string, OrgUnitUsage>> {
  const [users, extra, tasks, open] = await Promise.all([
    prisma.user.groupBy({ by: ["orgUnit"], where: { active: true }, _count: { _all: true } }),
    prisma.userRole.findMany({
      where: { orgUnit: { not: null }, user: { active: true } },
      select: { orgUnit: true, userId: true, user: { select: { orgUnit: true } } },
    }),
    prisma.task.groupBy({ by: ["orgUnit"], _count: { _all: true } }),
    prisma.task.groupBy({
      by: ["orgUnit"],
      where: { status: { in: ["I_RI", "NE_PROCES"] } },
      _count: { _all: true },
    }),
  ]);
  const usage: Record<string, OrgUnitUsage> = {};
  const at = (name: string) => (usage[name] ??= { users: 0, tasks: 0, openTasks: 0 });
  for (const r of users) if (r.orgUnit) at(r.orgUnit).users = r._count._all;
  const counted = new Set<string>();
  for (const r of extra) {
    const key = `${r.userId}|${r.orgUnit}`;
    if (!r.orgUnit || r.user.orgUnit === r.orgUnit || counted.has(key)) continue;
    counted.add(key);
    at(r.orgUnit).users++;
  }
  for (const r of tasks) if (r.orgUnit) at(r.orgUnit).tasks = r._count._all;
  for (const r of open) if (r.orgUnit) at(r.orgUnit).openTasks = r._count._all;
  return usage;
}

async function orgUnitNameTaken(name: string, exceptId?: string) {
  const clash = await prisma.orgUnit.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  return !!clash;
}

export async function createOrgUnit(name: string): Promise<OrgUnitView> {
  if (await orgUnitNameTaken(name)) throw new Error("EXISTS");
  try {
    return toOrgUnitView(await prisma.orgUnit.create({ data: { name } }));
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("EXISTS");
    throw e;
  }
}

/** Emri i ri vlen edhe për detyrat dhe përdoruesit; përgjigjet e lëshuara mbajnë emrin me të cilin u nënshkruan. */
export async function renameOrgUnit(id: string, name: string): Promise<OrgUnitView | null> {
  const current = await prisma.orgUnit.findUnique({ where: { id } });
  if (!current) return null;
  if (current.name === name) return toOrgUnitView(current);
  if (await orgUnitNameTaken(name, id)) throw new Error("EXISTS");
  try {
    const [updated] = await prisma.$transaction([
      prisma.orgUnit.update({ where: { id }, data: { name } }),
      prisma.user.updateMany({ where: { orgUnit: current.name }, data: { orgUnit: name } }),
      prisma.userRole.updateMany({ where: { orgUnit: current.name }, data: { orgUnit: name } }),
      prisma.task.updateMany({ where: { orgUnit: current.name }, data: { orgUnit: name } }),
    ]);
    return toOrgUnitView(updated);
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("EXISTS");
    throw e;
  }
}

export async function setOrgUnitActive(id: string, active: boolean): Promise<OrgUnitView | null> {
  const found = await prisma.orgUnit.findUnique({ where: { id }, select: { id: true } });
  if (!found) return null;
  return toOrgUnitView(await prisma.orgUnit.update({ where: { id }, data: { active } }));
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
    documents: t.documents.map((d) => ({ ...toDocumentRecord(d), uploadedBy: d.uploadedBy })),
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
  doc: NewDocumentInput,
  uploader: Actor & { id: string },
): Promise<DocumentRecord> {
  const [created] = await prisma.$transaction([
    prisma.document.create({ data: doc }),
    prisma.taskEvent.createMany({
      data: eventRows(doc.taskId, [documentEvent(doc.originalName)], uploader),
    }),
  ]);
  return toDocumentRecord(created);
}

export async function getDocument(
  taskId: string,
  docId: string,
): Promise<DocumentRecord | null> {
  const d = await prisma.document.findFirst({ where: { id: docId, taskId } });
  return d ? toDocumentRecord(d) : null;
}

export async function markDocumentSent(
  taskId: string,
  docId: string,
  to: string,
  sentAt: Date,
): Promise<DocumentRecord | null> {
  await prisma.document.updateMany({ where: { id: docId, taskId }, data: { sentAt, sentTo: to } });
  return getDocument(taskId, docId);
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

export async function hasNotificationSince(kind: NotificationKind, since: Date) {
  return (await prisma.notification.count({ where: { kind, createdAt: { gte: since } } })) > 0;
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

export async function listNotificationStats(range: { from: Date; to: Date }): Promise<NotificationStat[]> {
  const rows = await prisma.notification.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { userId: true, kind: true, createdAt: true, readAt: true },
  });
  return rows.map((n) => ({
    userId: n.userId,
    kind: n.kind as NotificationKind,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }));
}

export async function addAuditLog(entry: NewAuditEntry) {
  await prisma.auditLog.create({ data: entry });
}

export async function listAuditLogs(range: { from: Date; to: Date }, limit: number): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function pruneAuditLogs(before: Date) {
  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: before } } });
  return count;
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

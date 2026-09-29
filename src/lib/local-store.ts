import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  canTaskBeSeenBy,
  commentEvent,
  createdEvents,
  documentEvent,
  eventTimes,
  updateEvents,
  type EventDraft,
} from "@/lib/task-events";
import { computeStats } from "@/lib/stats";
import type {
  Actor,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
  EventMeta,
  EventType,
  HistoryView,
  NewNotification,
  NewTaskInput,
  NotificationView,
  ReportData,
  Role,
  TaskDetailView,
  TaskFilter,
  TaskListItem,
  TaskPatch,
  TaskRecord,
  TaskStatus,
  UserView,
} from "@/lib/types";

export type { Role, TaskStatus };

type LocalUser = AuthUser & { createdAt: string; updatedAt: string };

type LocalComment = {
  id: string;
  content: string;
  createdAt: string;
  taskId: string;
  authorId: string;
};

type LocalEvent = {
  id: string;
  taskId: string;
  type: EventType;
  message: string;
  actorId: string | null;
  actorName: string;
  meta?: EventMeta;
  createdAt: string;
};

type StoreData = {
  users: LocalUser[];
  tasks: TaskRecord[];
  comments: LocalComment[];
  documents: DocumentRecord[];
  events: LocalEvent[];
  notifications: NotificationView[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function defaultUsers(): LocalUser[] {
  const passwordHash = bcrypt.hashSync("Prania2026!", 10);
  const now = new Date().toISOString();
  const base = { passwordHash, active: true, createdAt: now, updatedAt: now };
  return [
    {
      ...base,
      id: "user-admin",
      email: "admin@praniabesnike.al",
      username: "admin",
      name: "Administrator",
      role: "ADMIN",
      orgUnit: null,
    },
    {
      ...base,
      id: "user-recepsion",
      email: "recepsion@praniabesnike.al",
      username: "recepsion",
      name: "Recepsion",
      role: "RECEPSION",
      orgUnit: null,
    },
    {
      ...base,
      id: "user-perfaqesues",
      email: "perfaqesues@praniabesnike.al",
      username: "perfaqesues",
      name: "Përfaqësues Drejtorie",
      role: "PERFAQESUES",
      orgUnit: "Drejtoria e Politikave Sociale",
    },
  ];
}

function emptyStore(): StoreData {
  return {
    users: defaultUsers(),
    tasks: [],
    comments: [],
    documents: [],
    events: [],
    notifications: [],
  };
}

/** Përshtat skedarë JSON të krijuar nga versione të mëparshme. */
function migrate(data: StoreData): boolean {
  let dirty = false;
  data.users = data.users.map((u) => {
    let next = u;
    if (next.orgUnit === undefined) {
      dirty = true;
      next = { ...next, orgUnit: null };
    }
    if (
      next.id === "user-perfaqesues" &&
      (next.name === "Përfaqësues Terreni" || next.name === "Përdorues Drejtorie")
    ) {
      dirty = true;
      next = { ...next, name: "Përfaqësues Drejtorie" };
    }
    return next;
  });
  const year = new Date().getFullYear();
  data.tasks = data.tasks.map((t, i) => {
    const legacy = t as TaskRecord & { ministry?: string | null };
    const next: TaskRecord & { ministry?: string | null } = { ...legacy };
    if (!next.orgUnit && legacy.ministry) {
      next.orgUnit = legacy.ministry;
      dirty = true;
    }
    if (next.orgUnit?.startsWith("Ministria ")) {
      next.orgUnit = "Drejtoria e Politikave Sociale";
      dirty = true;
    }
    if ("ministry" in next) {
      delete next.ministry;
      dirty = true;
    }
    if (!next.number) {
      next.number = `PB-${year}-${String(i + 1).padStart(4, "0")}`;
      dirty = true;
    } else if (/^PB-\d{4}$/.test(next.number)) {
      next.number = `PB-${year}-${next.number.slice(3)}`;
      dirty = true;
    }
    return next;
  });
  return dirty;
}

function readStore(): StoreData {
  ensureDir();
  if (!existsSync(STORE_PATH)) {
    const data = emptyStore();
    writeStore(data);
    return data;
  }
  const data = JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoreData;
  if (!data.users?.length) data.users = defaultUsers();
  data.tasks ||= [];
  data.comments ||= [];
  data.documents ||= [];
  data.events ||= [];
  data.notifications ||= [];
  if (migrate(data)) writeStore(data);
  return data;
}

function writeStore(data: StoreData) {
  ensureDir();
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function pushEvents(
  store: StoreData,
  taskId: string,
  drafts: EventDraft[],
  actor: Actor,
) {
  const times = eventTimes(drafts.length);
  drafts.forEach((d, i) => {
    store.events.push({
      id: randomUUID(),
      taskId,
      type: d.type,
      message: d.message,
      meta: d.meta,
      actorId: actor.id,
      actorName: actor.name,
      createdAt: times[i].toISOString(),
    });
  });
}

function toUserView(u: LocalUser): UserView {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    orgUnit: u.orgUnit,
    createdAt: u.createdAt,
  };
}

function userName(store: StoreData, id: string | null) {
  return id ? store.users.find((u) => u.id === id)?.name ?? null : null;
}

function toHistory(store: StoreData, e: LocalEvent): HistoryView {
  const actor = e.actorId ? store.users.find((u) => u.id === e.actorId) : null;
  return {
    ...e,
    actorRole: actor?.role ?? ((e.meta?.actorRole as Role | undefined) || null),
  };
}

export function findUserByLogin(login: string): AuthUser | null {
  const q = login.trim().toLowerCase();
  return (
    readStore().users.find(
      (u) =>
        u.active &&
        (u.email.toLowerCase() === q || u.username.toLowerCase() === q),
    ) ?? null
  );
}

export function listUsers(): UserView[] {
  return readStore()
    .users.filter((u) => u.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toUserView);
}

export function createUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  orgUnit: string | null;
}): UserView {
  const store = readStore();
  const exists = store.users.some(
    (u) =>
      u.email.toLowerCase() === input.email.toLowerCase() ||
      u.username.toLowerCase() === input.username.toLowerCase(),
  );
  if (exists) throw new Error("EXISTS");
  const now = new Date().toISOString();
  const user: LocalUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    username: input.username,
    passwordHash: bcrypt.hashSync(input.password, 10),
    role: input.role,
    orgUnit: input.orgUnit,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user);
  writeStore(store);
  return toUserView(user);
}

function nextTaskNumber(store: StoreData) {
  const prefix = `PB-${new Date().getFullYear()}-`;
  let max = 0;
  for (const t of store.tasks) {
    if (!t.number.startsWith(prefix)) continue;
    const n = parseInt(t.number.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function getTask(id: string): TaskRecord | null {
  return readStore().tasks.find((t) => t.id === id) ?? null;
}

export function listTasks(filter: TaskFilter = {}): TaskListItem[] {
  const store = readStore();
  let tasks = store.tasks;
  if (filter.access) {
    const access = filter.access;
    tasks = tasks.filter((t) => canTaskBeSeenBy(t, access));
  }
  if (filter.orgUnit) tasks = tasks.filter((t) => t.orgUnit === filter.orgUnit);
  if (filter.status) tasks = tasks.filter((t) => t.status === filter.status);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    tasks = tasks.filter((t) =>
      [t.title, t.description, t.citizenName, t.number, t.orgUnit].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }
  return [...tasks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => {
      const assigneeName = userName(store, t.assigneeId);
      return {
        ...t,
        assignee: t.assigneeId && assigneeName ? { id: t.assigneeId, name: assigneeName } : null,
        documentsCount: store.documents.filter((d) => d.taskId === t.id).length,
      };
    });
}

export function getTaskDetail(id: string): TaskDetailView | null {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return null;
  const assignee = task.assigneeId
    ? store.users.find((u) => u.id === task.assigneeId)
    : null;
  const creator = task.creatorId
    ? store.users.find((u) => u.id === task.creatorId)
    : null;

  return {
    ...task,
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email, role: assignee.role }
      : null,
    creator: creator ? { id: creator.id, name: creator.name } : null,
    documents: store.documents
      .filter((d) => d.taskId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((d) => ({ ...d, uploadedBy: { name: userName(store, d.uploadedById) || "—" } })),
    comments: store.comments
      .filter((c) => c.taskId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => {
        const author = store.users.find((u) => u.id === c.authorId);
        return {
          ...c,
          author: { name: author?.name || "—", role: author?.role || "PERFAQESUES" },
        };
      }),
    history: store.events
      .filter((e) => e.taskId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((e) => toHistory(store, e)),
  };
}

export function createTask(input: NewTaskInput, actor: Actor): TaskRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const task: TaskRecord = {
    ...input,
    id: randomUUID(),
    number: nextTaskNumber(store),
    status: "I_RI",
    createdAt: now,
    updatedAt: now,
  };
  store.tasks.unshift(task);
  pushEvents(store, task.id, createdEvents(task, userName(store, task.assigneeId)), actor);
  writeStore(store);
  return task;
}

export function updateTask(
  id: string,
  patch: TaskPatch,
  actor: Actor,
): TaskRecord | null {
  const store = readStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const prev = store.tasks[idx];
  const actorUser = actor.id ? store.users.find((u) => u.id === actor.id) : null;

  const drafts = updateEvents(prev, patch, {
    actorName: actor.name,
    actorRole: actorUser?.role ?? null,
    prevAssigneeName: userName(store, prev.assigneeId),
    nextAssigneeName: patch.assigneeId ? userName(store, patch.assigneeId) : null,
  });

  store.tasks[idx] = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  pushEvents(store, id, drafts, actor);
  writeStore(store);
  return store.tasks[idx];
}

export function deleteTask(id: string) {
  const store = readStore();
  store.tasks = store.tasks.filter((t) => t.id !== id);
  store.comments = store.comments.filter((c) => c.taskId !== id);
  store.documents = store.documents.filter((d) => d.taskId !== id);
  store.events = store.events.filter((e) => e.taskId !== id);
  store.notifications = store.notifications.filter((n) => n.taskId !== id);
  writeStore(store);
}

export function addComment(
  taskId: string,
  author: Actor & { id: string },
  content: string,
): CommentView {
  const store = readStore();
  const comment: LocalComment = {
    id: randomUUID(),
    taskId,
    authorId: author.id,
    content,
    createdAt: new Date().toISOString(),
  };
  store.comments.push(comment);
  pushEvents(store, taskId, [commentEvent(content)], author);
  writeStore(store);
  const user = store.users.find((u) => u.id === author.id);
  return {
    ...comment,
    author: { name: user?.name || author.name, role: user?.role || "PERFAQESUES" },
  };
}

export function addDocument(
  doc: Omit<DocumentRecord, "id" | "createdAt">,
  uploader: Actor & { id: string },
): DocumentRecord {
  const store = readStore();
  const full: DocumentRecord = {
    ...doc,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.documents.push(full);
  pushEvents(store, doc.taskId, [documentEvent(doc.originalName)], uploader);
  writeStore(store);
  return full;
}

export function getDocument(taskId: string, docId: string): DocumentRecord | null {
  return (
    readStore().documents.find((d) => d.id === docId && d.taskId === taskId) ?? null
  );
}

export function getDashboardStats(
  access?: { id: string; orgUnit?: string | null },
): DashboardStats {
  const store = readStore();
  const tasks = access
    ? store.tasks.filter((t) => canTaskBeSeenBy(t, access))
    : store.tasks;
  const docTaskIds = new Set(store.documents.map((d) => d.taskId));
  const visibleIds = new Set(tasks.map((t) => t.id));
  const titles = new Map(store.tasks.map((t) => [t.id, t.title]));

  const recentEvents = store.events
    .filter((e) => visibleIds.has(e.taskId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((e) => ({ ...toHistory(store, e), taskTitle: titles.get(e.taskId) || "—" }));

  return computeStats(tasks, {
    docTaskIds,
    userNames: new Map(store.users.map((u) => [u.id, u.name])),
    recentEvents,
    usersCount: store.users.filter((u) => u.active).length,
  });
}

export function createNotifications(items: NewNotification[]) {
  if (items.length === 0) return;
  const store = readStore();
  const now = new Date().toISOString();
  for (const n of items) {
    store.notifications.push({ ...n, id: randomUUID(), readAt: null, createdAt: now });
  }
  if (store.notifications.length > 5000) {
    store.notifications = store.notifications.slice(-5000);
  }
  writeStore(store);
}

export function listNotifications(userId: string, limit: number): NotificationView[] {
  return readStore()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function countUnreadNotifications(userId: string) {
  return readStore().notifications.filter((n) => n.userId === userId && !n.readAt).length;
}

export function markNotificationsRead(userId: string, ids?: string[]) {
  const store = readStore();
  const now = new Date().toISOString();
  const only = ids ? new Set(ids) : null;
  for (const n of store.notifications) {
    if (n.userId === userId && !n.readAt && (!only || only.has(n.id))) n.readAt = now;
  }
  writeStore(store);
}

export function getReportData(range: { from: Date; to: Date }): ReportData {
  const store = readStore();
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const inRange = (iso: string) => iso >= from && iso <= to;

  const tasks = store.tasks
    .filter((t) => inRange(t.createdAt))
    .map((t) => {
      const completedAt =
        t.status === "PERFUNDUAR"
          ? store.events
              .filter(
                (e) =>
                  e.taskId === t.id &&
                  e.type === "STATUS_CHANGED" &&
                  e.meta?.to === "PERFUNDUAR",
              )
              .map((e) => e.createdAt)
              .sort()
              .pop() ?? null
          : null;
      return {
        ...t,
        creatorName: userName(store, t.creatorId),
        completedAt,
        commentsCount: store.comments.filter((c) => c.taskId === t.id).length,
        documentsCount: store.documents.filter((d) => d.taskId === t.id).length,
      };
    });

  const unitOf = new Map(store.tasks.map((t) => [t.id, t.orgUnit]));
  const events = store.events
    .filter((e) => inRange(e.createdAt))
    .map((e) => ({
      taskId: e.taskId,
      orgUnit: unitOf.get(e.taskId) ?? null,
      type: e.type,
      actorId: e.actorId,
      actorName: e.actorName,
      createdAt: e.createdAt,
    }));

  return { tasks, events };
}

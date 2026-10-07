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
  responseEvent,
  responseNumber,
  responseUpdatedEvent,
  updateEvents,
  type EventDraft,
} from "@/lib/task-events";
import { computeStats } from "@/lib/stats";
import { DEFAULT_ORG_UNITS } from "@/lib/constants";
import type {
  Actor,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
  EventMeta,
  EventType,
  HistoryView,
  NewDocumentInput,
  NewNotification,
  NewTaskInput,
  NotificationKind,
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
  TaskStatus,
  UserPatch,
  UserView,
} from "@/lib/types";

export type { Role, TaskStatus };

type LocalUser = Omit<AuthUser, "mustChangePassword" | "sessionVersion"> & {
  emailNotifications?: boolean;
  mustChangePassword?: boolean;
  sessionVersion?: number;
  createdAt: string;
  updatedAt: string;
};

type LocalDocument = Omit<DocumentRecord, "sentAt" | "sentTo"> &
  Partial<Pick<DocumentRecord, "sentAt" | "sentTo">>;

type LocalResetToken = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

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

type LocalResponse = Omit<
  ResponseView,
  "number" | "isFinal" | "sentAt" | "sentTo" | "updatedAt"
> &
  Partial<Pick<ResponseView, "isFinal" | "sentAt" | "sentTo" | "updatedAt">>;

type StoreData = {
  users: LocalUser[];
  tasks: TaskRecord[];
  comments: LocalComment[];
  documents: LocalDocument[];
  responses: LocalResponse[];
  events: LocalEvent[];
  notifications: NotificationView[];
  orgUnits: OrgUnitView[];
  resetTokens: LocalResetToken[];
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
      email: "admin@praniabesnike.com",
      username: "admin",
      name: "Administrator",
      role: "ADMIN",
      orgUnit: null,
    },
    {
      ...base,
      id: "user-recepsion",
      email: "recepsion@praniabesnike.com",
      username: "recepsion",
      name: "Recepsion",
      role: "RECEPSION",
      orgUnit: null,
    },
    {
      ...base,
      id: "user-perfaqesues",
      email: "perfaqesues@praniabesnike.com",
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
    responses: [],
    events: [],
    notifications: [],
    orgUnits: [],
    resetTokens: [],
  };
}

function seedOrgUnits(data: StoreData): OrgUnitView[] {
  const now = new Date().toISOString();
  const names = new Set<string>(DEFAULT_ORG_UNITS);
  for (const x of [...data.users, ...data.tasks]) if (x.orgUnit) names.add(x.orgUnit);
  return [...names].map((name) => ({ id: randomUUID(), name, active: true, createdAt: now }));
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
    data.orgUnits = seedOrgUnits(data);
    writeStore(data);
    return data;
  }
  const data = JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoreData;
  if (!data.users?.length) data.users = defaultUsers();
  data.tasks ||= [];
  data.comments ||= [];
  data.documents ||= [];
  data.responses ||= [];
  data.events ||= [];
  data.notifications ||= [];
  data.resetTokens ||= [];
  let dirty = migrate(data);
  if (!data.orgUnits?.length) {
    data.orgUnits = seedOrgUnits(data);
    dirty = true;
  }
  if (dirty) writeStore(data);
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
    active: u.active,
    mustChangePassword: u.mustChangePassword ?? false,
    emailNotifications: u.emailNotifications ?? true,
    createdAt: u.createdAt,
  };
}

function toAuthUser(u: LocalUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    passwordHash: u.passwordHash,
    role: u.role,
    orgUnit: u.orgUnit,
    active: u.active,
    mustChangePassword: u.mustChangePassword ?? false,
    sessionVersion: u.sessionVersion ?? 0,
  };
}

function toDocumentRecord(d: LocalDocument): DocumentRecord {
  return { ...d, sentAt: d.sentAt ?? null, sentTo: d.sentTo ?? null };
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
  const u = readStore().users.find(
    (x) => x.active && (x.email.toLowerCase() === q || x.username.toLowerCase() === q),
  );
  return u ? toAuthUser(u) : null;
}

export function findUserById(id: string): AuthUser | null {
  const u = readStore().users.find((x) => x.id === id);
  return u ? toAuthUser(u) : null;
}

export function listUsers(): UserView[] {
  return readStore()
    .users.filter((u) => u.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toUserView);
}

export function listAllUsers(): UserView[] {
  return [...readStore().users]
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
    .map(toUserView);
}

export function getUser(id: string): UserView | null {
  const u = readStore().users.find((x) => x.id === id && x.active);
  return u ? toUserView(u) : null;
}

export function getAnyUser(id: string): UserView | null {
  const u = readStore().users.find((x) => x.id === id);
  return u ? toUserView(u) : null;
}

export function changePassword(id: string, current: string, next: string): PasswordChangeResult {
  const store = readStore();
  const u = store.users.find((x) => x.id === id && x.active);
  if (!u) return "NOT_FOUND";
  if (!bcrypt.compareSync(current, u.passwordHash)) return "WRONG_PASSWORD";
  u.passwordHash = bcrypt.hashSync(next, 10);
  u.mustChangePassword = false;
  u.updatedAt = new Date().toISOString();
  writeStore(store);
  return "OK";
}

function loginTaken(store: StoreData, email: string, username: string, exceptId?: string) {
  return store.users.some(
    (u) =>
      u.id !== exceptId &&
      (u.email.toLowerCase() === email.toLowerCase() ||
        u.username.toLowerCase() === username.toLowerCase()),
  );
}

export function updateUser(id: string, patch: UserPatch): UserView | null {
  const store = readStore();
  const u = store.users.find((x) => x.id === id);
  if (!u) return null;
  const next = { ...u, ...patch };
  if (loginTaken(store, next.email, next.username, id)) throw new Error("EXISTS");
  Object.assign(u, patch, { updatedAt: new Date().toISOString() });
  writeStore(store);
  return toUserView(u);
}

export function setUserActive(id: string, active: boolean): UserView | null {
  const store = readStore();
  const u = store.users.find((x) => x.id === id);
  if (!u) return null;
  u.active = active;
  if (!active) u.sessionVersion = (u.sessionVersion ?? 0) + 1;
  u.updatedAt = new Date().toISOString();
  writeStore(store);
  return toUserView(u);
}

export function setTemporaryPassword(id: string, password: string): boolean {
  const store = readStore();
  const u = store.users.find((x) => x.id === id);
  if (!u) return false;
  u.passwordHash = bcrypt.hashSync(password, 10);
  u.mustChangePassword = true;
  u.sessionVersion = (u.sessionVersion ?? 0) + 1;
  u.updatedAt = new Date().toISOString();
  store.resetTokens = store.resetTokens.filter((t) => t.userId !== id);
  writeStore(store);
  return true;
}

export function countActiveAdmins(excludeId?: string) {
  return readStore().users.filter((u) => u.role === "ADMIN" && u.active && u.id !== excludeId)
    .length;
}

export function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  const store = readStore();
  const now = new Date().toISOString();
  store.resetTokens = store.resetTokens.filter((t) => t.userId !== userId && t.expiresAt > now);
  store.resetTokens.push({
    id: randomUUID(),
    tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: now,
  });
  writeStore(store);
}

function validResetToken(store: StoreData, tokenHash: string) {
  const now = new Date().toISOString();
  const t = store.resetTokens.find((x) => x.tokenHash === tokenHash);
  if (!t || t.usedAt || t.expiresAt <= now) return null;
  const user = store.users.find((u) => u.id === t.userId && u.active);
  return user ? { t, user } : null;
}

export function isPasswordResetTokenValid(tokenHash: string) {
  return validResetToken(readStore(), tokenHash) !== null;
}

export function resetPasswordWithToken(tokenHash: string, password: string): "OK" | "INVALID" {
  const store = readStore();
  const found = validResetToken(store, tokenHash);
  if (!found) return "INVALID";
  const { t, user } = found;
  user.passwordHash = bcrypt.hashSync(password, 10);
  user.mustChangePassword = false;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.updatedAt = new Date().toISOString();
  store.resetTokens = store.resetTokens.filter((x) => x.userId !== t.userId);
  writeStore(store);
  return "OK";
}

export function listOrgUnits(): OrgUnitView[] {
  return readStore().orgUnits;
}

export function orgUnitUsage(): Record<string, OrgUnitUsage> {
  const store = readStore();
  const usage: Record<string, OrgUnitUsage> = {};
  const at = (name: string) => (usage[name] ??= { users: 0, tasks: 0, openTasks: 0 });
  for (const u of store.users) if (u.active && u.orgUnit) at(u.orgUnit).users++;
  for (const t of store.tasks) {
    if (!t.orgUnit) continue;
    at(t.orgUnit).tasks++;
    if (t.status === "I_RI" || t.status === "NE_PROCES") at(t.orgUnit).openTasks++;
  }
  return usage;
}

function orgUnitNameTaken(store: StoreData, name: string, exceptId?: string) {
  const q = name.toLowerCase();
  return store.orgUnits.some((o) => o.id !== exceptId && o.name.toLowerCase() === q);
}

export function createOrgUnit(name: string): OrgUnitView {
  const store = readStore();
  if (orgUnitNameTaken(store, name)) throw new Error("EXISTS");
  const unit: OrgUnitView = { id: randomUUID(), name, active: true, createdAt: new Date().toISOString() };
  store.orgUnits.push(unit);
  writeStore(store);
  return unit;
}

export function renameOrgUnit(id: string, name: string): OrgUnitView | null {
  const store = readStore();
  const unit = store.orgUnits.find((o) => o.id === id);
  if (!unit) return null;
  if (unit.name === name) return unit;
  if (orgUnitNameTaken(store, name, id)) throw new Error("EXISTS");
  const old = unit.name;
  unit.name = name;
  for (const u of store.users) if (u.orgUnit === old) u.orgUnit = name;
  for (const t of store.tasks) if (t.orgUnit === old) t.orgUnit = name;
  writeStore(store);
  return unit;
}

export function setOrgUnitActive(id: string, active: boolean): OrgUnitView | null {
  const store = readStore();
  const unit = store.orgUnits.find((o) => o.id === id);
  if (!unit) return null;
  unit.active = active;
  writeStore(store);
  return unit;
}

export function setEmailNotifications(id: string, enabled: boolean) {
  const store = readStore();
  const u = store.users.find((x) => x.id === id);
  if (!u) return;
  u.emailNotifications = enabled;
  u.updatedAt = new Date().toISOString();
  writeStore(store);
}

export function createUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  orgUnit: string | null;
  mustChangePassword?: boolean;
}): UserView {
  const store = readStore();
  if (loginTaken(store, input.email, input.username)) throw new Error("EXISTS");
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
    mustChangePassword: input.mustChangePassword ?? false,
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
      .map((d) => ({
        ...toDocumentRecord(d),
        uploadedBy: { name: userName(store, d.uploadedById) || "—" },
      })),
    responses: store.responses
      .filter((r) => r.taskId === id)
      .sort((a, b) => a.seq - b.seq)
      .map((r) => toResponseView(r, task.number)),
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
  store.responses = store.responses.filter((r) => r.taskId !== id);
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
  doc: NewDocumentInput,
  uploader: Actor & { id: string },
): DocumentRecord {
  const store = readStore();
  const full: DocumentRecord = {
    ...doc,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    sentAt: null,
    sentTo: null,
  };
  store.documents.push(full);
  pushEvents(store, doc.taskId, [documentEvent(doc.originalName)], uploader);
  writeStore(store);
  return full;
}

export function getDocument(taskId: string, docId: string): DocumentRecord | null {
  const d = readStore().documents.find((x) => x.id === docId && x.taskId === taskId);
  return d ? toDocumentRecord(d) : null;
}

export function markDocumentSent(
  taskId: string,
  docId: string,
  to: string,
  sentAt: Date,
): DocumentRecord | null {
  const store = readStore();
  const d = store.documents.find((x) => x.id === docId && x.taskId === taskId);
  if (!d) return null;
  d.sentAt = sentAt.toISOString();
  d.sentTo = to;
  writeStore(store);
  return toDocumentRecord(d);
}

function toResponseView(r: LocalResponse, taskNumber: string): ResponseView {
  return {
    ...r,
    isFinal: r.isFinal ?? false,
    sentAt: r.sentAt ?? null,
    sentTo: r.sentTo ?? null,
    updatedAt: r.updatedAt ?? r.createdAt,
    number: responseNumber(taskNumber, r.seq),
  };
}

export function addResponse(
  taskId: string,
  input: ResponseInput & { orgUnit: string },
  author: Actor,
): ResponseView | null {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const seq =
    store.responses.reduce((max, r) => (r.taskId === taskId ? Math.max(max, r.seq) : max), 0) + 1;
  const now = new Date().toISOString();
  const response: LocalResponse = {
    id: randomUUID(),
    taskId,
    seq,
    content: input.content,
    orgUnit: input.orgUnit,
    isFinal: input.isFinal,
    authorId: author.id,
    authorName: author.name,
    sentAt: null,
    sentTo: null,
    createdAt: now,
    updatedAt: now,
  };
  const view = toResponseView(response, task.number);
  store.responses.push(response);
  pushEvents(store, taskId, [responseEvent(view.number, input.orgUnit, input.isFinal)], author);
  writeStore(store);
  return view;
}

export function getResponse(taskId: string, responseId: string): ResponseView | null {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === taskId);
  const r = store.responses.find((x) => x.id === responseId && x.taskId === taskId);
  return task && r ? toResponseView(r, task.number) : null;
}

/** Kthen null nëse përgjigjja nuk ekziston ose është dërguar tashmë (e kyçur). */
export function updateResponse(
  taskId: string,
  responseId: string,
  input: ResponseInput,
  actor: Actor,
): ResponseView | null {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === taskId);
  const r = store.responses.find((x) => x.id === responseId && x.taskId === taskId);
  if (!task || !r || r.sentAt) return null;
  r.content = input.content;
  r.isFinal = input.isFinal;
  r.updatedAt = new Date().toISOString();
  const view = toResponseView(r, task.number);
  pushEvents(store, taskId, [responseUpdatedEvent(view.number, view.isFinal)], actor);
  writeStore(store);
  return view;
}

export function markResponseSent(
  taskId: string,
  responseId: string,
  to: string,
  sentAt: Date,
): ResponseView | null {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === taskId);
  const r = store.responses.find((x) => x.id === responseId && x.taskId === taskId);
  if (!task || !r) return null;
  if (!r.sentAt) {
    r.sentAt = sentAt.toISOString();
    r.sentTo = to;
    writeStore(store);
  }
  return toResponseView(r, task.number);
}

export function logTaskEvent(taskId: string, draft: EventDraft, actor: Actor) {
  const store = readStore();
  pushEvents(store, taskId, [draft], actor);
  writeStore(store);
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

export function hasNotificationSince(kind: NotificationKind, since: Date) {
  const iso = since.toISOString();
  return readStore().notifications.some((n) => n.kind === kind && n.createdAt >= iso);
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

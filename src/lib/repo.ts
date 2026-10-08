import path from "path";
import type { EventDraft } from "@/lib/task-events";
import type {
  Actor,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
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
  UserPatch,
  UserView,
} from "@/lib/types";

export function isLocalMode() {
  return (process.env.DATA_MODE || "local").toLowerCase() !== "postgres";
}

async function store() {
  return isLocalMode() ? import("@/lib/local-store") : import("@/lib/pg-store");
}

export function uploadsRoot() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  return isLocalMode()
    ? path.join(process.cwd(), ".data", "uploads")
    : path.join(process.cwd(), "uploads");
}

export async function findUserByLogin(login: string): Promise<AuthUser | null> {
  return (await store()).findUserByLogin(login);
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  return (await store()).findUserById(id);
}

export async function listUsers(): Promise<UserView[]> {
  return (await store()).listUsers();
}

/** Përfshin edhe përdoruesit e çaktivizuar (vetëm për administrimin). */
export async function listAllUsers(): Promise<UserView[]> {
  return (await store()).listAllUsers();
}

export async function getUser(id: string): Promise<UserView | null> {
  return (await store()).getUser(id);
}

export async function getAnyUser(id: string): Promise<UserView | null> {
  return (await store()).getAnyUser(id);
}

export async function updateUser(id: string, patch: UserPatch): Promise<UserView | null> {
  return (await store()).updateUser(id, patch);
}

export async function setUserActive(id: string, active: boolean): Promise<UserView | null> {
  return (await store()).setUserActive(id, active);
}

export async function addUserRole(
  userId: string,
  role: Role,
  orgUnit: string | null,
): Promise<UserView | null> {
  return (await store()).addUserRole(userId, role, orgUnit);
}

export async function removeUserRole(userId: string, roleId: string): Promise<UserView | null> {
  return (await store()).removeUserRole(userId, roleId);
}

/** Mbyll seancat e hapura dhe e detyron përdoruesin ta ndryshojë në hyrjen e radhës. */
export async function setTemporaryPassword(id: string, password: string): Promise<boolean> {
  return (await store()).setTemporaryPassword(id, password);
}

export async function countActiveAdmins(excludeId?: string): Promise<number> {
  return (await store()).countActiveAdmins(excludeId);
}

export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await (await store()).createPasswordResetToken(userId, tokenHash, expiresAt);
}

export async function isPasswordResetTokenValid(tokenHash: string): Promise<boolean> {
  return (await store()).isPasswordResetTokenValid(tokenHash);
}

export async function resetPasswordWithToken(
  tokenHash: string,
  password: string,
): Promise<"OK" | "INVALID"> {
  return (await store()).resetPasswordWithToken(tokenHash, password);
}

export async function listOrgUnits(): Promise<OrgUnitView[]> {
  const units = await (await store()).listOrgUnits();
  return [...units].sort((a, b) => a.name.localeCompare(b.name, "sq"));
}

export async function activeOrgUnitNames(): Promise<string[]> {
  return (await listOrgUnits()).filter((o) => o.active).map((o) => o.name);
}

export async function isActiveOrgUnit(name: string): Promise<boolean> {
  return (await activeOrgUnitNames()).includes(name);
}

export async function orgUnitUsage(): Promise<Record<string, OrgUnitUsage>> {
  return (await store()).orgUnitUsage();
}

export async function createOrgUnit(name: string): Promise<OrgUnitView> {
  return (await store()).createOrgUnit(name);
}

export async function renameOrgUnit(id: string, name: string): Promise<OrgUnitView | null> {
  return (await store()).renameOrgUnit(id, name);
}

export async function setOrgUnitActive(id: string, active: boolean): Promise<OrgUnitView | null> {
  return (await store()).setOrgUnitActive(id, active);
}

export async function changePassword(
  id: string,
  current: string,
  next: string,
): Promise<PasswordChangeResult> {
  return (await store()).changePassword(id, current, next);
}

export async function setEmailNotifications(id: string, enabled: boolean): Promise<void> {
  await (await store()).setEmailNotifications(id, enabled);
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
  return (await store()).createUser(input);
}

export async function getTask(id: string): Promise<TaskRecord | null> {
  return (await store()).getTask(id);
}

export async function listTasks(filter?: TaskFilter): Promise<TaskListItem[]> {
  return (await store()).listTasks(filter);
}

export async function getTaskDetail(id: string): Promise<TaskDetailView | null> {
  return (await store()).getTaskDetail(id);
}

export async function createTask(input: NewTaskInput, actor: Actor): Promise<TaskRecord> {
  return (await store()).createTask(input, actor);
}

export async function updateTask(
  id: string,
  patch: TaskPatch,
  actor: Actor,
): Promise<TaskRecord | null> {
  return (await store()).updateTask(id, patch, actor);
}

export async function deleteTask(id: string): Promise<void> {
  await (await store()).deleteTask(id);
}

export async function addComment(
  taskId: string,
  author: Actor & { id: string },
  content: string,
): Promise<CommentView> {
  return (await store()).addComment(taskId, author, content);
}

export async function addDocument(
  doc: NewDocumentInput,
  uploader: Actor & { id: string },
): Promise<DocumentRecord> {
  return (await store()).addDocument(doc, uploader);
}

export async function getDocument(
  taskId: string,
  docId: string,
): Promise<DocumentRecord | null> {
  return (await store()).getDocument(taskId, docId);
}

export async function markDocumentSent(
  taskId: string,
  docId: string,
  to: string,
  sentAt: Date,
): Promise<DocumentRecord | null> {
  return (await store()).markDocumentSent(taskId, docId, to, sentAt);
}

export async function addResponse(
  taskId: string,
  input: ResponseInput & { orgUnit: string },
  author: Actor,
): Promise<ResponseView | null> {
  return (await store()).addResponse(taskId, input, author);
}

export async function getResponse(
  taskId: string,
  responseId: string,
): Promise<ResponseView | null> {
  return (await store()).getResponse(taskId, responseId);
}

export async function updateResponse(
  taskId: string,
  responseId: string,
  input: ResponseInput,
  actor: Actor,
): Promise<ResponseView | null> {
  return (await store()).updateResponse(taskId, responseId, input, actor);
}

export async function markResponseSent(
  taskId: string,
  responseId: string,
  to: string,
  sentAt: Date,
): Promise<ResponseView | null> {
  return (await store()).markResponseSent(taskId, responseId, to, sentAt);
}

export async function logTaskEvent(taskId: string, draft: EventDraft, actor: Actor): Promise<void> {
  await (await store()).logTaskEvent(taskId, draft, actor);
}

export async function getDashboardStats(
  access?: { id: string; orgUnit?: string | null },
): Promise<DashboardStats> {
  return (await store()).getDashboardStats(access);
}

export async function createNotifications(items: NewNotification[]): Promise<void> {
  await (await store()).createNotifications(items);
}

export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationView[]> {
  return (await store()).listNotifications(userId, limit);
}

export async function hasNotificationSince(kind: NotificationKind, since: Date): Promise<boolean> {
  return (await store()).hasNotificationSince(kind, since);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return (await store()).countUnreadNotifications(userId);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  await (await store()).markNotificationsRead(userId, ids);
}

export async function getReportData(range: { from: Date; to: Date }): Promise<ReportData> {
  return (await store()).getReportData(range);
}

import path from "path";
import type {
  Actor,
  AuthUser,
  CommentView,
  DashboardStats,
  DocumentRecord,
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

export async function listUsers(): Promise<UserView[]> {
  return (await store()).listUsers();
}

export async function createUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  orgUnit: string | null;
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
  doc: Omit<DocumentRecord, "id" | "createdAt">,
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

export async function countUnreadNotifications(userId: string): Promise<number> {
  return (await store()).countUnreadNotifications(userId);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  await (await store()).markNotificationsRead(userId, ids);
}

export async function getReportData(range: { from: Date; to: Date }): Promise<ReportData> {
  return (await store()).getReportData(range);
}

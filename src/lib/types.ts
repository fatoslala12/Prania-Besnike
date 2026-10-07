export type Role = "PERFAQESUES" | "RECEPSION" | "ADMIN";
export type TaskStatus = "I_RI" | "NE_PROCES" | "PERFUNDUAR" | "BLOKUAR";
export type EventType =
  | "CREATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "DOCUMENT_UPLOADED"
  | "UPDATED"
  | "RESPONSE_ADDED"
  | "EMAIL_SENT";

export type EventMeta = Record<string, string | number | boolean | null | undefined>;

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
  orgUnit: string | null;
  active: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
};

export type UserView = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  orgUnit: string | null;
  active: boolean;
  mustChangePassword: boolean;
  emailNotifications: boolean;
  createdAt: string;
};

export type UserPatch = Partial<Pick<UserView, "name" | "email" | "username" | "role" | "orgUnit">>;

export type PasswordChangeResult = "OK" | "WRONG_PASSWORD" | "NOT_FOUND";

export type OrgUnitView = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export type OrgUnitUsage = { users: number; tasks: number; openTasks: number };

export type TaskRecord = {
  id: string;
  number: string;
  title: string;
  description: string;
  status: TaskStatus;
  orgUnit: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  citizenPhone: string | null;
  requestDate: string | null;
  isCitizenRequest: boolean;
  createdAt: string;
  updatedAt: string;
  creatorId: string | null;
  assigneeId: string | null;
};

export type TaskListItem = TaskRecord & {
  assignee: { id: string; name: string } | null;
  documentsCount: number;
};

export type DocumentRecord = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
  taskId: string;
  uploadedById: string;
  sentAt: string | null;
  sentTo: string | null;
};

export type NewDocumentInput = Omit<DocumentRecord, "id" | "createdAt" | "sentAt" | "sentTo">;

export type DocumentView = DocumentRecord & { uploadedBy: { name: string } };

export type CommentView = {
  id: string;
  content: string;
  createdAt: string;
  taskId: string;
  authorId: string;
  author: { name: string; role: Role };
};

export type HistoryView = {
  id: string;
  taskId: string;
  type: EventType;
  message: string;
  actorId: string | null;
  actorName: string;
  actorRole: Role | null;
  meta?: EventMeta;
  createdAt: string;
};

export type ResponseView = {
  id: string;
  taskId: string;
  seq: number;
  /** Numri zyrtar: <nr. i kërkesës>-<seq>, p.sh. PB-2026-0001-2 */
  number: string;
  content: string;
  orgUnit: string;
  /** true = përgjigje përfundimtare (kërkesa → Përfunduar); false = e pjesshme */
  isFinal: boolean;
  authorId: string | null;
  authorName: string;
  /** Pasi dërgohet me email, përgjigjja nuk ndryshohet më. */
  sentAt: string | null;
  sentTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResponseInput = { content: string; isFinal: boolean };

export type TaskDetailView = TaskRecord & {
  assignee: { id: string; name: string; email: string; role: Role } | null;
  creator: { id: string; name: string } | null;
  documents: DocumentView[];
  comments: CommentView[];
  responses: ResponseView[];
  history: HistoryView[];
};

export type TaskFilter = {
  /** Kufizon rezultatet te detyrat ku përdoruesi ka akses (jo-admin). */
  access?: { id: string; orgUnit?: string | null };
  orgUnit?: string;
  status?: TaskStatus;
  q?: string;
};

export type NewTaskInput = {
  title: string;
  description: string;
  orgUnit: string | null;
  assigneeId: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  citizenPhone: string | null;
  requestDate: string | null;
  isCitizenRequest: boolean;
  creatorId: string | null;
};

export type TaskPatch = Partial<
  Pick<TaskRecord, "title" | "description" | "status" | "assigneeId" | "orgUnit">
>;

export type Actor = { id: string | null; name: string };

export type NotificationKind =
  | "TASK_NEW"
  | "TASK_DELEGATED"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "DOCUMENT_UPLOADED"
  | "RESPONSE_ADDED"
  | "REMINDER";

export type NewNotification = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  taskId: string | null;
};

export type NotificationView = NewNotification & {
  id: string;
  readAt: string | null;
  createdAt: string;
};

export type ReportTask = TaskRecord & {
  creatorName: string | null;
  completedAt: string | null;
  commentsCount: number;
  documentsCount: number;
};

export type ReportEvent = {
  taskId: string;
  orgUnit: string | null;
  type: EventType;
  actorId: string | null;
  actorName: string;
  createdAt: string;
};

export type ReportData = { tasks: ReportTask[]; events: ReportEvent[] };

export type DashboardStats = {
  total: number;
  unassigned: number;
  citizen: number;
  withDocs: number;
  byStatus: Record<TaskStatus, number>;
  ministries: { name: string; count: number }[];
  byAssignee: { id: string; name: string; count: number }[];
  recentEvents: (HistoryView & { taskTitle: string })[];
  last7: { date: string; label: string; count: number }[];
  usersCount: number;
};

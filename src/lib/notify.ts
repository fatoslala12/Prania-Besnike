import { after } from "next/server";
import { STATUS_LABELS, shortOrgUnit } from "@/lib/constants";
import { escapeHtml, renderEmail } from "@/lib/email-template";
import { mailEnabled, publicLink, sendMail } from "@/lib/mailer";
import { createNotifications, listUsers } from "@/lib/repo";
import type {
  NewNotification,
  NotificationKind,
  TaskRecord,
  TaskStatus,
  UserView,
} from "@/lib/types";

export type TaskChange =
  | { kind: "TASK_NEW"; task: TaskRecord }
  | { kind: "TASK_DELEGATED"; task: TaskRecord; fromOrgUnit: string | null; note?: string | null }
  | { kind: "STATUS_CHANGED"; task: TaskRecord; from: TaskStatus }
  | { kind: "COMMENT_ADDED"; task: TaskRecord; content: string }
  | { kind: "DOCUMENT_UPLOADED"; task: TaskRecord; fileName: string }
  | { kind: "RESPONSE_ADDED"; task: TaskRecord; number: string; orgUnit: string };

type Actor = { id: string | null; name: string };

/**
 * Marrësit sipas aksesit:
 * - Drejtoria: detyrat e njësisë së vet (ose të caktuara personalisht).
 * - Admin/Recepsion: detyra të reja, ri-delegime, ndryshime statusi.
 * - Krijuesi i detyrës: çdo përditësim të saj.
 */
function recipients(change: TaskChange, users: UserView[], actor: Actor) {
  const { task } = change;
  const unit = users.filter(
    (u) =>
      (u.role === "PERFAQESUES" && !!task.orgUnit && u.orgUnit === task.orgUnit) ||
      u.id === task.assigneeId,
  );
  const managers = users.filter((u) => u.role === "ADMIN" || u.role === "RECEPSION");
  const creator = users.filter((u) => u.id === task.creatorId);

  const groups: UserView[][] = {
    TASK_NEW: [unit, managers],
    TASK_DELEGATED: [unit, managers, creator],
    STATUS_CHANGED: [unit, managers, creator],
    COMMENT_ADDED: [unit, creator],
    DOCUMENT_UPLOADED: [unit, creator],
    RESPONSE_ADDED: [unit, managers, creator],
  }[change.kind];

  const seen = new Map<string, UserView>();
  for (const u of groups.flat()) {
    if (u.id !== actor.id) seen.set(u.id, u);
  }
  return [...seen.values()];
}

function describe(change: TaskChange, actor: Actor): { title: string; body: string } {
  const { task } = change;
  const unit = task.orgUnit ? shortOrgUnit(task.orgUnit) : "pa delegim";
  switch (change.kind) {
    case "TASK_NEW":
      return {
        title: task.isCitizenRequest
          ? `Kërkesë e re qytetari ${task.number}`
          : `Detyrë e re ${task.number}`,
        body: `${task.title} · ${unit}`,
      };
    case "TASK_DELEGATED":
      return {
        title: `${task.number} u ri-delegua te ${unit}`,
        body:
          `${actor.name}: ${change.fromOrgUnit ? shortOrgUnit(change.fromOrgUnit) : "—"} → ${unit}` +
          (change.note ? `\nShënim: ${change.note}` : ""),
      };
    case "STATUS_CHANGED":
      return {
        title: `${task.number}: ${STATUS_LABELS[change.from]} → ${STATUS_LABELS[task.status]}`,
        body: `${actor.name} ndryshoi statusin · ${task.title}`,
      };
    case "COMMENT_ADDED":
      return {
        title: `Koment i ri te ${task.number}`,
        body: `${actor.name}: ${change.content.slice(0, 200)}`,
      };
    case "DOCUMENT_UPLOADED":
      return {
        title: `Dokument i ri te ${task.number}`,
        body: `${actor.name} ngarkoi «${change.fileName}»`,
      };
    case "RESPONSE_ADDED":
      return {
        title: `Përgjigje zyrtare ${change.number}`,
        body: `${actor.name} (${shortOrgUnit(change.orgUnit)}) lëshoi përgjigjen · ${task.title}`,
      };
  }
}

export function notificationEmail(title: string, body: string, link: string, action = "Hap detyrën") {
  const url = publicLink(link);
  const cta = url
    ? `<a href="${escapeHtml(url)}" style="display:inline-block;background:#a63240;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">${escapeHtml(action)}</a>`
    : `<p style="margin:0;color:#555555">Hyni në panelin Prania Besnike për ta parë.</p>`;
  const footer =
    "Njoftim automatik nga Prania Besnike · MSHMS, sepse keni llogari në sistem. Njoftimet me email mund t'i çaktivizoni te «Profili im» në panel.";
  const text =
    `${title}\n\n${body}\n\n` +
    (url ? `${action}: ${url}` : "Hyni në panelin Prania Besnike për ta parë.") +
    `\n\n— Prania Besnike · MSHMS\n${footer}`;
  const html = renderEmail({
    title,
    band: "PRANIA BESNIKE · MSHMS",
    preheader: body.slice(0, 140),
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:18px;line-height:1.3">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;white-space:pre-line">${escapeHtml(body)}</p>
${cta}`,
    footer,
  });
  return { text, html };
}

/** Dështimet regjistrohen në log; nuk e ndalin veprimin që shkaktoi njoftimin. */
export async function mailUsers(
  users: UserView[],
  subject: string,
  mail: { text: string; html: string },
) {
  const to = users.filter((u) => u.email && u.emailNotifications);
  if (!mailEnabled() || to.length === 0) return;
  const results = await Promise.allSettled(
    to.map((u) => sendMail({ to: u.email, subject, automated: true, ...mail })),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) console.error(`Email: ${failed.length} dështuan`, failed[0]);
}

export async function notifyTaskChange(change: TaskChange, actor: Actor) {
  try {
    const users = await listUsers();
    const to = recipients(change, users, actor);
    if (to.length === 0) return;

    const { title, body } = describe(change, actor);
    const link = `/panel/detyra/${change.task.id}`;
    const kind: NotificationKind = change.kind;
    const items: NewNotification[] = to.map((u) => ({
      userId: u.id,
      kind,
      title,
      body,
      link,
      taskId: change.task.id,
    }));
    await createNotifications(items);
    const mail = notificationEmail(title, body, link);
    after(() => mailUsers(to, `[Prania Besnike] ${title}`, mail));
  } catch (e) {
    console.error("Njoftimi dështoi", e);
  }
}

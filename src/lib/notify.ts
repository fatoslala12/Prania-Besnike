import { after } from "next/server";
import { STATUS_LABELS, shortOrgUnit } from "@/lib/constants";
import { mailEnabled, sendMail } from "@/lib/mailer";
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

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function emailFor(title: string, body: string, link: string) {
  const base = (process.env.AUTH_URL || "").replace(/\/$/, "");
  const url = base ? `${base}${link}` : link;
  const text = `${title}\n\n${body}\n\nHapni detyrën: ${url}\n\n— Prania Besnike · MSHMS`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4f4;font-family:Arial,sans-serif;color:#1c1c1c">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
<tr><td style="background:#a63240;color:#fff;padding:16px 24px;font-weight:bold;letter-spacing:.08em;font-size:13px">PRANIA BESNIKE · MSHMS</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;line-height:1.5;white-space:pre-line">${escapeHtml(body)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#a63240;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Hap detyrën</a>
</td></tr>
<tr><td style="padding:12px 24px;font-size:11px;color:#888;border-top:1px solid #eee">Njoftim automatik. Mos iu përgjigjni këtij emaili.</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
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

    if (mailEnabled()) {
      const mail = emailFor(title, body, link);
      after(async () => {
        const results = await Promise.allSettled(
          to
            .filter((u) => u.email)
            .map((u) => sendMail({ to: u.email, subject: `[Prania Besnike] ${title}`, ...mail })),
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length) console.error(`Email: ${failed.length} dështuan`, failed[0]);
      });
    }
  } catch (e) {
    console.error("Njoftimi dështoi", e);
  }
}

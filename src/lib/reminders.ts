import { isManagerRole, isReadOnlyRole, shortOrgUnit } from "@/lib/constants";
import { mailUsers, notificationEmail } from "@/lib/notify";
import { OVERDUE_DAYS } from "@/lib/reports";
import { createNotifications, hasNotificationSince, listTasks, listUsers } from "@/lib/repo";
import type { NewNotification, TaskListItem, UserView } from "@/lib/types";
import { expandRoles } from "@/lib/user-roles";

const TZ = "Europe/Tirane";
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 60 * 1000;
const LIST_LIMIT = 10;

function tiranaClock(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour);
  const sinceMidnight = (hour * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return {
    hour,
    weekend: parts.weekday === "Sat" || parts.weekday === "Sun",
    startOfDay: new Date(now.getTime() - sinceMidnight - now.getMilliseconds()),
  };
}

function tasksForRole(user: UserView, overdue: TaskListItem[]) {
  if (isReadOnlyRole(user.role)) return [];
  if (isManagerRole(user.role)) return overdue;
  return overdue.filter(
    (t) => (!!t.orgUnit && t.orgUnit === user.orgUnit) || t.assigneeId === user.id,
  );
}

/** Bashkimi i kërkesave për të gjitha rolet e përdoruesit, në rendin e `overdue`. */
function tasksFor(user: UserView, overdue: TaskListItem[]) {
  const ids = new Set(expandRoles([user]).flatMap((r) => tasksForRole(r, overdue).map((t) => t.id)));
  return overdue.filter((t) => ids.has(t.id));
}

function digest(tasks: TaskListItem[], now: number) {
  const lines = tasks.slice(0, LIST_LIMIT).map((t) => {
    const days = Math.floor((now - Date.parse(t.createdAt)) / DAY_MS);
    const unit = t.orgUnit ? shortOrgUnit(t.orgUnit) : "pa delegim";
    return `• ${t.number} · ${days} ditë · ${unit} · ${t.title}`;
  });
  if (tasks.length > LIST_LIMIT) lines.push(`… dhe ${tasks.length - LIST_LIMIT} të tjera`);
  return lines.join("\n");
}

/**
 * Një përmbledhje në ditë për kërkesat e hapura (I ri / Në proces) më të vjetra
 * se OVERDUE_DAYS. Njoftimet REMINDER të ditës shërbejnë si shënim "u dërgua",
 * ndaj rinisja e serverit nuk e dërgon dy herë.
 */
export async function runOverdueReminders(now = new Date()) {
  const { startOfDay } = tiranaClock(now);
  if (await hasNotificationSince("REMINDER", startOfDay)) return 0;

  const cutoff = now.getTime() - OVERDUE_DAYS * DAY_MS;
  const overdue = (await listTasks())
    .filter((t) => (t.status === "I_RI" || t.status === "NE_PROCES") && Date.parse(t.createdAt) < cutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (overdue.length === 0) return 0;

  const users = await listUsers();
  const items: NewNotification[] = [];
  const mails: Promise<void>[] = [];
  for (const user of users) {
    const mine = tasksFor(user, overdue);
    if (mine.length === 0) continue;
    const title =
      mine.length === 1
        ? `1 kërkesë e hapur prej më shumë se ${OVERDUE_DAYS} ditësh`
        : `${mine.length} kërkesa të hapura prej më shumë se ${OVERDUE_DAYS} ditësh`;
    const body = digest(mine, now.getTime());
    const link = mine.length === 1 ? `/panel/detyra/${mine[0].id}` : "/panel";
    items.push({ userId: user.id, kind: "REMINDER", title, body, link, taskId: mine.length === 1 ? mine[0].id : null });
    mails.push(
      mailUsers([user], `[Prania Besnike] Kujtesë: ${title}`, notificationEmail(title, body, link, "Shiko kërkesat")),
    );
  }
  await createNotifications(items);
  await Promise.all(mails);
  return items.length;
}

const g = globalThis as typeof globalThis & { __praniaReminders?: NodeJS.Timeout };

/** Kontrollon çdo 15 min; dërgon vetëm ditëve të punës, pas orës REMINDER_HOUR (parazgjedhur 8:00). */
export function startReminderScheduler() {
  if (g.__praniaReminders) return;
  const hour = Number(process.env.REMINDER_HOUR || 8);
  const tick = async () => {
    const clock = tiranaClock(new Date());
    if (clock.weekend || clock.hour < hour || clock.hour >= 18) return;
    try {
      const n = await runOverdueReminders();
      if (n) console.log(`Kujtesa ditore: u njoftuan ${n} përdorues`);
    } catch (e) {
      console.error("Kujtesa ditore dështoi", e);
    }
  };
  g.__praniaReminders = setInterval(tick, CHECK_EVERY_MS);
  g.__praniaReminders.unref();
  setTimeout(tick, 60_000).unref();
}

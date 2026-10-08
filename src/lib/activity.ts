import { addDays, differenceInCalendarDays, format, subDays } from "date-fns";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  actionLabel,
  actionModule,
  parseUserAgent,
  reasonLabel,
  type AuditModule,
  type DeviceInfo,
} from "@/lib/audit-catalog";
import type { AuditEntry, NotificationKind, NotificationStat, Role, UserView } from "@/lib/types";

export const MAX_RANGE_DAYS = 180;
export const PAGE_SIZE = 30;
/** Kufiri i rreshtave që lexohen për një periudhë; mjafton me bollëk për këtë sistem. */
export const FETCH_LIMIT = 20_000;
/** Kaq tentativa të dështuara nga e njëjta IP në periudhë e bëjnë "të dyshimtë". */
export const SUSPICIOUS_FAILS = 5;

const DAY_FMT = "yyyy-MM-dd";
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type PeriodFilter = { from: string; to: string };

export function parsePeriod(sp: Record<string, string | string[] | undefined>, defaultDays = 7): PeriodFilter {
  const today = format(new Date(), DAY_FMT);
  let to = isDay(one(sp.to)) ? one(sp.to)! : today;
  let from = isDay(one(sp.from)) ? one(sp.from)! : format(subDays(new Date(`${to}T00:00:00`), defaultDays - 1), DAY_FMT);
  if (from > to) [from, to] = [to, from];
  const span = differenceInCalendarDays(new Date(`${to}T00:00:00`), new Date(`${from}T00:00:00`));
  if (span >= MAX_RANGE_DAYS) from = format(subDays(new Date(`${to}T00:00:00`), MAX_RANGE_DAYS - 1), DAY_FMT);
  return { from, to };
}

export function periodRange(p: PeriodFilter) {
  return { from: new Date(`${p.from}T00:00:00`), to: new Date(`${p.to}T23:59:59.999`) };
}

export function periodPresets() {
  const today = new Date();
  const d = (n: number) => format(subDays(today, n), DAY_FMT);
  return [
    { label: "Sot", from: d(0) },
    { label: "7 ditë", from: d(6) },
    { label: "30 ditë", from: d(29) },
    { label: "90 ditë", from: d(89) },
  ].map((p) => ({ ...p, to: d(0) }));
}

function days(p: PeriodFilter) {
  const out: { key: string; label: string }[] = [];
  const end = new Date(`${p.to}T00:00:00`);
  for (let d = new Date(`${p.from}T00:00:00`); d <= end; d = addDays(d, 1)) {
    out.push({ key: format(d, DAY_FMT), label: format(d, "dd.MM") });
  }
  return out;
}

const dayKey = (iso: string) => format(new Date(iso), DAY_FMT);

// ---------------------------------------------------------------- Aktiviteti

/** "" = gjithçka përveç email-eve (ato kanë faqen e tyre); "ALL" = me email-et. */
export type ModuleFilter = "" | "ALL" | AuditModule;

export type ActivityFilter = PeriodFilter & {
  module: ModuleFilter;
  action: string;
  status: "" | "ok" | "fail";
  q: string;
  page: number;
};

export function parseActivityFilter(sp: Record<string, string | string[] | undefined>): ActivityFilter {
  const mod = one(sp.module) ?? "";
  const action = one(sp.action) ?? "";
  const status = one(sp.status) ?? "";
  return {
    ...parsePeriod(sp),
    module: (mod === "ALL" || Object.hasOwn(AUDIT_MODULES, mod) ? mod : "") as ModuleFilter,
    action: Object.hasOwn(AUDIT_ACTIONS, action) ? action : "",
    status: status === "ok" || status === "fail" ? status : "",
    q: (one(sp.q) ?? "").trim().slice(0, 100),
    page: Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1),
  };
}

export function activityQuery(f: ActivityFilter, patch: Partial<ActivityFilter> = {}) {
  const merged = { ...f, ...patch };
  const qs = new URLSearchParams();
  qs.set("from", merged.from);
  qs.set("to", merged.to);
  if (merged.module) qs.set("module", merged.module);
  if (merged.action) qs.set("action", merged.action);
  if (merged.status) qs.set("status", merged.status);
  if (merged.q) qs.set("q", merged.q);
  if (merged.page > 1) qs.set("page", String(merged.page));
  return qs.toString();
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function matchesActivity(l: AuditEntry, f: ActivityFilter) {
  if (f.action && l.action !== f.action) return false;
  if (!f.action) {
    if (f.module === "" && l.module === "EMAIL") return false;
    if (f.module && f.module !== "ALL" && l.module !== f.module) return false;
  }
  if (f.status === "ok" && !l.success) return false;
  if (f.status === "fail" && l.success) return false;
  if (f.q) {
    const hay = fold([l.userName, l.login, l.ip, l.targetLabel, l.details].filter(Boolean).join(" "));
    if (!hay.includes(fold(f.q))) return false;
  }
  return true;
}

export type ActiveUser = {
  userId: string;
  name: string;
  role: string | null;
  logins: number;
  ips: number;
  lastLoginAt: string;
  lastSeenAt: string;
  ip: string | null;
  device: DeviceInfo;
};

export type FailingIp = { ip: string; count: number; logins: string[]; lastAt: string; suspicious: boolean };

export function buildActivity(all: AuditEntry[], f: ActivityFilter, now = new Date()) {
  const staff = all.filter((l) => l.module !== "EMAIL");
  const logins = staff.filter((l) => l.action === "LOGIN_SUCCESS");
  const failed = staff.filter((l) => l.action === "LOGIN_FAILED");
  const todayKey = format(now, DAY_FMT);
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const kpis = {
    total: staff.length,
    today: staff.filter((l) => dayKey(l.createdAt) === todayKey).length,
    logins: logins.length,
    failed: failed.length,
    failRate: logins.length + failed.length ? Math.round((failed.length * 100) / (logins.length + failed.length)) : 0,
    failed24h: failed.filter((l) => Date.parse(l.createdAt) >= dayAgo).length,
    activeUsers: new Set(logins.map((l) => l.userId).filter(Boolean)).size,
    ips: new Set(logins.concat(failed).map((l) => l.ip).filter(Boolean)).size,
  };

  const daily = days(f).map((d) => ({ ...d, ok: 0, fail: 0, other: 0 }));
  const dayIndex = new Map(daily.map((d, i) => [d.key, i]));
  for (const l of staff) {
    const i = dayIndex.get(dayKey(l.createdAt));
    if (i === undefined) continue;
    if (l.action === "LOGIN_SUCCESS") daily[i].ok++;
    else if (l.action === "LOGIN_FAILED") daily[i].fail++;
    else daily[i].other++;
  }

  const actionCounts = new Map<string, number>();
  for (const l of staff) actionCounts.set(l.action, (actionCounts.get(l.action) ?? 0) + 1);
  const byAction = [...actionCounts].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count);

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, ok: 0, fail: 0 }));
  for (const l of logins) byHour[new Date(l.createdAt).getHours()].ok++;
  for (const l of failed) byHour[new Date(l.createdAt).getHours()].fail++;

  const reasonCounts = new Map<string, number>();
  for (const l of failed) reasonCounts.set(l.reason ?? "?", (reasonCounts.get(l.reason ?? "?") ?? 0) + 1);
  const reasons = [...reasonCounts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

  const ipMap = new Map<string, FailingIp>();
  for (const l of failed) {
    const ip = l.ip ?? "e panjohur";
    const row = ipMap.get(ip) ?? { ip, count: 0, logins: [], lastAt: l.createdAt, suspicious: false };
    row.count++;
    if (l.login && !row.logins.includes(l.login)) row.logins.push(l.login);
    if (l.createdAt > row.lastAt) row.lastAt = l.createdAt;
    ipMap.set(ip, row);
  }
  const failingIps = [...ipMap.values()]
    .map((r) => ({ ...r, suspicious: r.count >= SUSPICIOUS_FAILS }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const loginMap = new Map<string, { login: string; count: number; known: boolean }>();
  for (const l of failed) {
    if (!l.login) continue;
    const key = l.login.toLowerCase();
    const row = loginMap.get(key) ?? { login: l.login, count: 0, known: false };
    row.count++;
    if (l.userId) row.known = true;
    loginMap.set(key, row);
  }
  const failingLogins = [...loginMap.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  const users = new Map<string, ActiveUser & { ipSet: Set<string> }>();
  for (const l of [...logins].reverse()) {
    if (!l.userId) continue;
    const u = users.get(l.userId) ?? {
      userId: l.userId,
      name: l.userName ?? l.login ?? "—",
      role: l.role,
      logins: 0,
      ips: 0,
      ipSet: new Set<string>(),
      lastLoginAt: l.createdAt,
      lastSeenAt: l.createdAt,
      ip: l.ip,
      device: parseUserAgent(l.userAgent),
    };
    u.logins++;
    if (l.ip) u.ipSet.add(l.ip);
    if (l.createdAt >= u.lastLoginAt) {
      Object.assign(u, { lastLoginAt: l.createdAt, ip: l.ip, device: parseUserAgent(l.userAgent), role: l.role });
    }
    users.set(l.userId, u);
  }
  for (const l of staff) {
    const u = l.userId ? users.get(l.userId) : undefined;
    if (u && l.createdAt > u.lastSeenAt) {
      u.lastSeenAt = l.createdAt;
      if (l.action === "ROLE_SWITCH" || l.action === "LOGIN_SUCCESS") u.role = l.role;
    }
  }
  const activeUsers: ActiveUser[] = [...users.values()]
    .map(({ ipSet, ...u }) => ({ ...u, ips: ipSet.size }))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  const filtered = all.filter((l) => matchesActivity(l, f));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { kpis, daily, byAction, byHour, reasons, failingIps, failingLogins, activeUsers, filtered, rows, page, pages };
}

export function auditCsv(rows: AuditEntry[]) {
  const head = ["Data", "Ora", "Veprimi", "Moduli", "Rezultati", "Arsyeja", "Përdoruesi", "Login", "Roli", "IP", "Sistemi", "Shfletuesi", "Pajisja", "Objekti", "Detaje"];
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((l) => {
    const d = new Date(l.createdAt);
    const dev = parseUserAgent(l.userAgent);
    const mod = actionModule(l.action);
    return [
      format(d, "dd.MM.yyyy"),
      format(d, "HH:mm:ss"),
      actionLabel(l.action),
      mod ? AUDIT_MODULES[mod] : l.module,
      l.success ? "Sukses" : "Dështim",
      reasonLabel(l.reason),
      l.userName,
      l.login,
      l.role,
      l.ip,
      l.userAgent ? dev.os : "",
      l.userAgent ? dev.browser : "",
      l.userAgent ? dev.device : "",
      l.targetLabel,
      l.details,
    ]
      .map(esc)
      .join(";");
  });
  return "\uFEFF" + [head.join(";"), ...lines].join("\r\n");
}

// ---------------------------------------------------------------- Njoftimet

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  TASK_NEW: "Kërkesë e re",
  TASK_DELEGATED: "Delegim",
  STATUS_CHANGED: "Ndryshim statusi",
  COMMENT_ADDED: "Koment",
  DOCUMENT_UPLOADED: "Dokument",
  RESPONSE_ADDED: "Përgjigje",
  REMINDER: "Kujtesë ditore",
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function buildNotificationStats(
  notes: NotificationStat[],
  emails: AuditEntry[],
  users: UserView[],
  p: PeriodFilter,
) {
  const total = notes.length;
  const read = notes.filter((n) => n.readAt);
  const readHours = read.map((n) => (Date.parse(n.readAt!) - Date.parse(n.createdAt)) / 3_600_000).filter((h) => h >= 0);
  const sent = emails.filter((e) => e.action === "EMAIL_SENT");
  const failedEmails = emails.filter((e) => e.action === "EMAIL_FAILED");

  const kpis = {
    total,
    read: read.length,
    unread: total - read.length,
    readRate: total ? Math.round((read.length * 100) / total) : 0,
    avgReadHours: readHours.length ? readHours.reduce((a, b) => a + b, 0) / readHours.length : null,
    medianReadHours: median(readHours),
    emailsSent: sent.length,
    emailsFailed: failedEmails.length,
    recipients: new Set(notes.map((n) => n.userId)).size,
  };

  const daily = days(p).map((d) => ({ ...d, total: 0, read: 0, emails: 0, emailFails: 0 }));
  const idx = new Map(daily.map((d, i) => [d.key, i]));
  for (const n of notes) {
    const i = idx.get(dayKey(n.createdAt));
    if (i === undefined) continue;
    daily[i].total++;
    if (n.readAt) daily[i].read++;
  }
  for (const e of emails) {
    const i = idx.get(dayKey(e.createdAt));
    if (i === undefined) continue;
    if (e.action === "EMAIL_SENT") daily[i].emails++;
    else daily[i].emailFails++;
  }

  const kindMap = new Map<NotificationKind, { total: number; read: number }>();
  for (const n of notes) {
    const row = kindMap.get(n.kind) ?? { total: 0, read: 0 };
    row.total++;
    if (n.readAt) row.read++;
    kindMap.set(n.kind, row);
  }
  const byKind = [...kindMap]
    .map(([kind, r]) => ({ kind, ...r, readRate: Math.round((r.read * 100) / r.total) }))
    .sort((a, b) => b.total - a.total);

  const userById = new Map(users.map((u) => [u.id, u]));
  const roleMap = new Map<Role, { total: number; read: number }>();
  const perUser = new Map<string, { total: number; unread: number }>();
  for (const n of notes) {
    const role = userById.get(n.userId)?.role;
    if (role) {
      const r = roleMap.get(role) ?? { total: 0, read: 0 };
      r.total++;
      if (n.readAt) r.read++;
      roleMap.set(role, r);
    }
    const u = perUser.get(n.userId) ?? { total: 0, unread: 0 };
    u.total++;
    if (!n.readAt) u.unread++;
    perUser.set(n.userId, u);
  }
  const byRole = [...roleMap].map(([role, r]) => ({ role, ...r })).sort((a, b) => b.total - a.total);
  const topUnread = [...perUser]
    .map(([userId, r]) => ({ userId, name: userById.get(userId)?.name ?? "Përdorues i fshirë", role: userById.get(userId)?.role ?? null, ...r }))
    .filter((r) => r.unread > 0)
    .sort((a, b) => b.unread - a.unread)
    .slice(0, 8);

  const recentFailures = failedEmails.slice(0, 8);
  const failReasons = new Map<string, number>();
  for (const e of failedEmails) {
    const key = (e.reason ?? "?").split(/[:\n]/)[0].slice(0, 80);
    failReasons.set(key, (failReasons.get(key) ?? 0) + 1);
  }

  const insights: { tone: "ok" | "warn" | "bad" | "info"; title: string; text: string }[] = [];
  if (total === 0) {
    insights.push({ tone: "info", title: "Pa njoftime", text: "Në këtë periudhë nuk është krijuar asnjë njoftim." });
  } else {
    const top = byKind[0];
    insights.push({
      tone: "info",
      title: "Lloji më i shpeshtë",
      text: `${NOTIFICATION_KIND_LABELS[top.kind]}: ${top.total} njoftime (${Math.round((top.total * 100) / total)}% e totalit).`,
    });
    insights.push(
      kpis.readRate >= 70
        ? { tone: "ok", title: "Lexueshmëri e mirë", text: `${kpis.readRate}% e njoftimeve janë lexuar.` }
        : {
            tone: "warn",
            title: "Shumë njoftime pa u lexuar",
            text: `Vetëm ${kpis.readRate}% janë lexuar. Kujtojuni stafit të hapë kambanën ose kontrolloni nëse marrin email-et.`,
          },
    );
    const heavy = topUnread.filter((u) => u.unread >= 10);
    if (heavy.length) {
      insights.push({
        tone: "warn",
        title: "Përdorues që s'i hapin njoftimet",
        text: `${heavy.map((u) => u.name).slice(0, 3).join(", ")}${heavy.length > 3 ? ` dhe ${heavy.length - 3} të tjerë` : ""} kanë 10+ njoftime të palexuara.`,
      });
    }
  }
  if (failedEmails.length) {
    insights.push({
      tone: "bad",
      title: "Email-e të dështuara",
      text: `${failedEmails.length} email nuk u dërguan. Kontrolloni listën më poshtë; nëse përsëriten, mund të ketë problem me SMTP-në.`,
    });
  } else if (sent.length) {
    insights.push({ tone: "ok", title: "Email-et punojnë", text: `${sent.length} email u dërguan pa asnjë dështim.` });
  }

  return {
    kpis,
    daily,
    byKind,
    byRole,
    topUnread,
    recentFailures,
    failReasons: [...failReasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    insights,
  };
}

export function formatHours(h: number | null) {
  if (h == null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h < 10 ? h.toFixed(1).replace(".0", "") : Math.round(h)} orë`;
  return `${Math.round(h / 24)} ditë`;
}
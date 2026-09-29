import { format } from "date-fns";
import { STATUS_LABELS, isOrgUnit } from "@/lib/constants";
import type { ReportData, ReportTask, TaskStatus } from "@/lib/types";

export const PUBLIC_CREATOR = "public";
export const OVERDUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

export type ReportFilter = {
  from: string;
  to: string;
  orgUnit?: string;
  status?: TaskStatus;
  source?: "citizen" | "internal";
  creatorId?: string;
};

type RawParams = Record<string, string | string[] | undefined>;

function isoDay(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function param(sp: RawParams, key: string) {
  const v = sp[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function parseReportFilter(sp: RawParams): ReportFilter {
  const today = new Date();
  const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  let from = valid(param(sp, "from")) ?? isoDay(new Date(today.getTime() - 29 * DAY_MS));
  let to = valid(param(sp, "to")) ?? isoDay(today);
  if (from > to) [from, to] = [to, from];

  const status = param(sp, "status");
  const source = param(sp, "source");
  const orgUnit = param(sp, "orgUnit");
  return {
    from,
    to,
    orgUnit: orgUnit && (isOrgUnit(orgUnit) || orgUnit === "none") ? orgUnit : undefined,
    status: status && status in STATUS_LABELS ? (status as TaskStatus) : undefined,
    source: source === "citizen" || source === "internal" ? source : undefined,
    creatorId: param(sp, "creatorId"),
  };
}

export function filterRange(f: ReportFilter) {
  return {
    from: new Date(`${f.from}T00:00:00`),
    to: new Date(`${f.to}T23:59:59.999`),
  };
}

export function filterQuery(f: ReportFilter, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) q.set(k, String(v));
  return q.toString();
}

function resolutionHours(t: ReportTask) {
  if (!t.completedAt) return null;
  return Math.max(0, (Date.parse(t.completedAt) - Date.parse(t.createdAt)) / 3_600_000);
}

function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function formatDuration(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours)} orë`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h ? `${d} ditë ${h} orë` : `${d} ditë`;
}

export function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function emptyStatus(): Record<TaskStatus, number> {
  return { I_RI: 0, NE_PROCES: 0, PERFUNDUAR: 0, BLOKUAR: 0 };
}

export function buildReport(data: ReportData, f: ReportFilter) {
  const now = Date.now();
  const tasks = data.tasks
    .filter((t) => {
      if (f.orgUnit === "none" ? t.orgUnit : f.orgUnit && t.orgUnit !== f.orgUnit) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.source === "citizen" && !t.isCitizenRequest) return false;
      if (f.source === "internal" && t.isCitizenRequest) return false;
      if (f.creatorId === PUBLIC_CREATOR ? t.creatorId : f.creatorId && t.creatorId !== f.creatorId)
        return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const byStatus = emptyStatus();
  for (const t of tasks) byStatus[t.status]++;
  const resolved = tasks.map(resolutionHours).filter((h): h is number => h !== null);
  const isOpen = (t: ReportTask) => t.status === "I_RI" || t.status === "NE_PROCES";
  const overdue = tasks.filter(
    (t) => isOpen(t) && now - Date.parse(t.createdAt) > OVERDUE_DAYS * DAY_MS,
  ).length;
  const citizen = tasks.filter((t) => t.isCitizenRequest).length;

  const totals = {
    total: tasks.length,
    byStatus,
    open: byStatus.I_RI + byStatus.NE_PROCES,
    citizen,
    internal: tasks.length - citizen,
    unassigned: tasks.filter((t) => !t.orgUnit).length,
    overdue,
    completionRate: pct(byStatus.PERFUNDUAR, tasks.length),
    avgResolutionHours: avg(resolved),
    medianResolutionHours: median(resolved),
  };

  const unitMap = new Map<string, ReportTask[]>();
  for (const t of tasks) {
    const key = t.orgUnit || "Pa delegim";
    unitMap.set(key, [...(unitMap.get(key) ?? []), t]);
  }
  const byUnit = [...unitMap.entries()]
    .map(([name, list]) => {
      const s = emptyStatus();
      for (const t of list) s[t.status]++;
      const hrs = list.map(resolutionHours).filter((h): h is number => h !== null);
      return {
        name,
        total: list.length,
        byStatus: s,
        citizen: list.filter((t) => t.isCitizenRequest).length,
        overdue: list.filter(
          (t) => isOpen(t) && now - Date.parse(t.createdAt) > OVERDUE_DAYS * DAY_MS,
        ).length,
        completionRate: pct(s.PERFUNDUAR, list.length),
        avgResolutionHours: avg(hrs),
      };
    })
    .sort((a, b) => b.total - a.total);

  const creatorMap = new Map<string, { id: string; name: string; list: ReportTask[] }>();
  for (const t of tasks) {
    const id = t.creatorId ?? PUBLIC_CREATOR;
    const name = t.creatorId ? t.creatorName || "—" : "Formular publik (qytetarë)";
    const entry = creatorMap.get(id) ?? { id, name, list: [] };
    entry.list.push(t);
    creatorMap.set(id, entry);
  }
  const byCreator = [...creatorMap.values()]
    .map(({ id, name, list }) => ({
      id,
      name,
      total: list.length,
      completed: list.filter((t) => t.status === "PERFUNDUAR").length,
      open: list.filter(isOpen).length,
      share: pct(list.length, tasks.length),
    }))
    .sort((a, b) => b.total - a.total);

  const createdAtByTask = new Map<string, number>();
  for (const e of data.events) {
    if (e.type === "CREATED") createdAtByTask.set(e.taskId, Date.parse(e.createdAt));
  }
  const events = data.events.filter((e) =>
    f.orgUnit === "none" ? !e.orgUnit : !f.orgUnit || e.orgUnit === f.orgUnit,
  );
  const actMap = new Map<
    string,
    {
      name: string;
      created: number;
      status: number;
      redelegated: number;
      comments: number;
      documents: number;
      responses: number;
    }
  >();
  for (const e of events) {
    const key = e.actorId ?? `anon:${e.actorName}`;
    const a =
      actMap.get(key) ??
      { name: e.actorName, created: 0, status: 0, redelegated: 0, comments: 0, documents: 0, responses: 0 };
    if (e.type === "CREATED") a.created++;
    else if (e.type === "STATUS_CHANGED") a.status++;
    else if (e.type === "ASSIGNED") {
      const born = createdAtByTask.get(e.taskId);
      if (born === undefined || Date.parse(e.createdAt) - born > 1000) a.redelegated++;
    } else if (e.type === "COMMENT_ADDED") a.comments++;
    else if (e.type === "DOCUMENT_UPLOADED") a.documents++;
    else if (e.type === "RESPONSE_ADDED") a.responses++;
    actMap.set(key, a);
  }
  const activity = [...actMap.values()]
    .map((a) => ({
      ...a,
      total: a.created + a.status + a.redelegated + a.comments + a.documents + a.responses,
    }))
    .sort((a, b) => b.total - a.total);

  const { from, to } = filterRange(f);
  const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const monthly = spanDays > 62;
  const bucketKey = (iso: string) => format(new Date(iso), monthly ? "yyyy-MM" : "yyyy-MM-dd");
  const buckets: { key: string; label: string; created: number; completed: number }[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    buckets.push({
      key: format(cursor, monthly ? "yyyy-MM" : "yyyy-MM-dd"),
      label: format(cursor, monthly ? "MM.yyyy" : "dd.MM"),
      created: 0,
      completed: 0,
    });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1, 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const t of tasks) {
    const i = idx.get(bucketKey(t.createdAt));
    if (i !== undefined) buckets[i].created++;
    if (t.completedAt) {
      const j = idx.get(bucketKey(t.completedAt));
      if (j !== undefined) buckets[j].completed++;
    }
  }

  return {
    tasks,
    totals,
    byUnit,
    byCreator,
    activity,
    trend: { monthly, buckets },
    statuses: STATUSES,
    resolutionHours,
  };
}

export type Report = ReturnType<typeof buildReport>;

function csvCell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  return "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function reportCsv(report: Report, type: string) {
  const dt = (iso: string | null) => (iso ? format(new Date(iso), "dd.MM.yyyy HH:mm") : "");
  switch (type) {
    case "units":
      return toCsv(
        ["Drejtoria / Agjencia", "Totali", ...STATUSES.map((s) => STATUS_LABELS[s]), "Nga qytetarët", `Të vonuara (>${OVERDUE_DAYS} ditë)`, "% zgjidhje", "Koha mesatare e zgjidhjes"],
        report.byUnit.map((u) => [u.name, u.total, ...STATUSES.map((s) => u.byStatus[s]), u.citizen, u.overdue, `${u.completionRate}%`, formatDuration(u.avgResolutionHours)]),
      );
    case "creators":
      return toCsv(
        ["Gjeneruar nga", "Totali", "Përfunduar", "Të hapura", "% e totalit"],
        report.byCreator.map((c) => [c.name, c.total, c.completed, c.open, `${c.share}%`]),
      );
    case "activity":
      return toCsv(
        ["Përdoruesi", "Krijime", "Ndryshime statusi", "Ri-delegime", "Komente", "Dokumente", "Përgjigje zyrtare", "Totali"],
        report.activity.map((a) => [a.name, a.created, a.status, a.redelegated, a.comments, a.documents, a.responses, a.total]),
      );
    default:
      return toCsv(
        ["ID", "Data e krijimit", "Titulli", "Drejtoria / Agjencia", "Statusi", "Burimi", "Qytetari", "Telefoni", "Email", "Gjeneruar nga", "Përfunduar më", "Koha e zgjidhjes", "Komente", "Dokumente"],
        report.tasks.map((t) => [
          t.number,
          dt(t.createdAt),
          t.title,
          t.orgUnit ?? "Pa delegim",
          STATUS_LABELS[t.status],
          t.isCitizenRequest ? "Qytetar" : "I brendshëm",
          t.citizenName,
          t.citizenPhone,
          t.citizenEmail,
          t.creatorId ? t.creatorName : "Formular publik",
          dt(t.completedAt),
          formatDuration(report.resolutionHours(t)),
          t.commentsCount,
          t.documentsCount,
        ]),
      );
  }
}

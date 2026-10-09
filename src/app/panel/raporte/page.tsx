import Image from "next/image";
import Link from "next/link";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { FileSpreadsheet } from "lucide-react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import {
  ROLE_LABELS,
  STATUS_LABELS,
  canCreateTask,
  canViewReports,
  shortOrgUnit,
} from "@/lib/constants";
import {
  OVERDUE_DAYS,
  PUBLIC_CREATOR,
  buildReport,
  filterQuery,
  filterRange,
  formatDuration,
  parseReportFilter,
  pct,
  type ReportFilter,
} from "@/lib/reports";
import { getReportData, listOrgUnits, listUsers } from "@/lib/repo";
import type { ExcelSheet } from "@/lib/report-excel";
import { MobileFilters } from "@/components/MobileFilters";
import { PrintButton } from "@/components/PrintButton";
import type { TaskStatus } from "@/lib/types";

export const metadata = { title: "Raporte" };

const STATUS_COLOR: Record<TaskStatus, string> = {
  I_RI: "bg-brand",
  NE_PROCES: "bg-amber-500",
  PERFUNDUAR: "bg-emerald-600",
  BLOKUAR: "bg-zinc-400",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  I_RI: "bg-brand-soft text-brand",
  NE_PROCES: "bg-amber-50 text-amber-800",
  PERFUNDUAR: "bg-emerald-50 text-emerald-800",
  BLOKUAR: "bg-zinc-100 text-zinc-600",
};

function day(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function excelHref(filter: ReportFilter, sheet: ExcelSheet = "summary") {
  return `/api/reports/excel?${filterQuery(filter, { sheet })}`;
}

function ExcelLink({ filter, sheet }: { filter: ReportFilter; sheet: ExcelSheet }) {
  return (
    <a
      href={excelHref(filter, sheet)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline print:hidden"
    >
      <FileSpreadsheet className="h-3.5 w-3.5" />
      Excel
    </a>
  );
}

function SectionHead({
  title,
  hint,
  filter,
  type,
}: {
  title: string;
  hint?: string;
  filter: ReportFilter;
  type?: ExcelSheet;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold print:text-base">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {type && <ExcelLink filter={filter} sheet={type} />}
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewReports(session.user)) redirect("/panel");
  const units = (await listOrgUnits()).map((o) => o.name);
  const filter = parseReportFilter(await searchParams, units);
  const [data, users] = await Promise.all([getReportData(filterRange(filter)), listUsers()]);
  const r = buildReport(data, filter);
  const t = r.totals;

  const today = new Date();
  const presets = [
    { label: "Sot", from: day(today) },
    { label: "7 ditë", from: day(subDays(today, 6)) },
    { label: "30 ditë", from: day(subDays(today, 29)) },
    { label: "Ky muaj", from: day(startOfMonth(today)) },
    { label: "Ky vit", from: day(startOfYear(today)) },
  ];
  const activeFilters = [filter.status, filter.orgUnit, filter.source, filter.creatorId].filter(Boolean).length;
  const creators = users.filter((u) => canCreateTask(u.role));
  const maxBucket = Math.max(1, ...r.trend.buckets.map((b) => Math.max(b.created, b.completed)));
  const maxUnit = Math.max(1, ...r.byUnit.map((u) => u.total));

  const kpis = [
    { label: "Kërkesa gjithsej", value: t.total, sub: `${t.citizen} nga qytetarët · ${t.internal} të brendshme` },
    { label: "Të hapura", value: t.open, sub: `${t.byStatus.I_RI} të reja · ${t.byStatus.NE_PROCES} në proces` },
    { label: "Përfunduar", value: t.byStatus.PERFUNDUAR, sub: `${t.completionRate}% shkalla e zgjidhjes` },
    { label: "Bllokuar", value: t.byStatus.BLOKUAR, sub: `${pct(t.byStatus.BLOKUAR, t.total)}% e totalit` },
    { label: "Koha mesatare e zgjidhjes", value: formatDuration(t.avgResolutionHours), sub: `Mediana: ${formatDuration(t.medianResolutionHours)}` },
    { label: `Të vonuara (>${OVERDUE_DAYS} ditë)`, value: t.overdue, sub: `${t.unassigned} pa delegim` },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 print:space-y-4">
      <style>{"@media print { @page { size: A4 landscape; margin: 10mm 10mm 12mm; } }"}</style>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between print:flex-row print:items-center print:justify-start print:gap-4 print:border-b-2 print:border-brand print:pb-3">
        <Image
          src="/mshms-logo.png"
          alt=""
          width={74}
          height={56}
          className="hidden h-14 w-auto print:block"
        />
        <div>
          <p className="section-kicker print:hidden">Raportim</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl print:hidden">Raporte</h1>
          <p className="hidden text-xl font-extrabold text-brand print:block">Raport i kërkesave</p>
          <p className="hidden text-xs font-semibold text-ink print:block">
            Prania Besnike · Ministria e Shëndetësisë dhe Mbrojtjes Sociale
          </p>
          <p className="mt-1 text-sm text-muted print:text-xs">
            Periudha {format(new Date(`${filter.from}T00:00:00`), "dd.MM.yyyy")} –{" "}
            {format(new Date(`${filter.to}T00:00:00`), "dd.MM.yyyy")}
            {filter.orgUnit && ` · ${filter.orgUnit === "none" ? "Pa delegim" : filter.orgUnit}`}
            {filter.status && ` · ${STATUS_LABELS[filter.status]}`}
            {filter.source && ` · ${filter.source === "citizen" ? "Nga qytetarët" : "Të brendshme"}`}
            {" · "}gjeneruar më {format(today, "dd.MM.yyyy HH:mm")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row print:hidden">
          <a
            href={excelHref(filter)}
            className="btn-primary inline-flex items-center justify-center gap-1.5 !py-2 text-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Shkarko Excel
          </a>
          <PrintButton />
        </div>
      </div>

      <form className="surface-card space-y-4 p-4 sm:p-5 print:hidden">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/panel/raporte?${filterQuery({ ...filter, from: p.from, to: day(today) })}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter.from === p.from && filter.to === day(today)
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink/70 hover:border-brand hover:text-brand"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <MobileFilters activeCount={activeFilters}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="from">Nga data</label>
            <input id="from" name="from" type="date" defaultValue={filter.from} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="to">Deri më</label>
            <input id="to" name="to" type="date" defaultValue={filter.to} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="status">Statusi</label>
            <select id="status" name="status" defaultValue={filter.status ?? ""} className="field">
              <option value="">Të gjitha</option>
              {r.statuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="orgUnit">Drejtoria / Agjencia</label>
            <select id="orgUnit" name="orgUnit" defaultValue={filter.orgUnit ?? ""} className="field">
              <option value="">Të gjitha</option>
              <option value="none">— Pa delegim —</option>
              {units.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="source">Burimi</label>
            <select id="source" name="source" defaultValue={filter.source ?? ""} className="field">
              <option value="">Të gjitha</option>
              <option value="citizen">Formulari i qytetarit</option>
              <option value="internal">Të brendshme (staf)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="creatorId">Gjeneruar nga</label>
            <select id="creatorId" name="creatorId" defaultValue={filter.creatorId ?? ""} className="field">
              <option value="">Të gjithë</option>
              <option value={PUBLIC_CREATOR}>Formular publik (qytetarë)</option>
              {creators.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {ROLE_LABELS[u.role]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="btn-primary !py-2 text-sm">Apliko filtrat</button>
          <Link href="/panel/raporte" className="btn-ghost !py-2 text-center text-sm">Pastro filtrat</Link>
        </div>
        </MobileFilters>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6 print:grid-cols-6 print:gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="surface-card p-4 print:break-inside-avoid print:border-l-4 print:border-l-brand print:p-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{k.label}</p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink print:text-xl">{k.value}</p>
            <p className="mt-1 text-[0.7rem] text-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-card min-w-0 p-4 sm:p-5 print:break-inside-avoid print:p-3">
          <SectionHead title="Shpërndarja sipas statusit" filter={filter} />
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-zinc-100">
            {r.statuses.map((s) =>
              t.byStatus[s] ? (
                <div
                  key={s}
                  className={STATUS_COLOR[s]}
                  style={{ width: `${pct(t.byStatus[s], t.total)}%` }}
                  title={`${STATUS_LABELS[s]}: ${t.byStatus[s]}`}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-4 space-y-2.5">
            {r.statuses.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s]}`} />
                  {STATUS_LABELS[s]}
                </span>
                <span className="font-semibold tabular-nums">
                  {t.byStatus[s]}
                  <span className="ml-2 text-xs font-normal text-muted">{pct(t.byStatus[s], t.total)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5 print:break-inside-avoid print:p-3">
          <SectionHead
            title={r.trend.monthly ? "Trendi mujor" : "Trendi ditor"}
            hint="Kërkesa të krijuara dhe të përfunduara në periudhë"
            filter={filter}
          />
          <div dir="rtl" className="no-scrollbar mt-4 flex h-44 flex-row-reverse items-end gap-[2px] overflow-x-auto pb-1 print:overflow-visible">
            {r.trend.buckets.map((b) => (
              <div
                key={b.key}
                dir="ltr"
                className="flex min-w-[8px] flex-1 flex-col items-center justify-end gap-1"
                title={`${b.label}: ${b.created} krijuar · ${b.completed} përfunduar`}
              >
                <div className="flex h-36 w-full items-end justify-center gap-[1px]">
                  <div className="w-1/2 rounded-t bg-brand" style={{ height: `${(b.created / maxBucket) * 100}%` }} />
                  <div className="w-1/2 rounded-t bg-emerald-500" style={{ height: `${(b.completed / maxBucket) * 100}%` }} />
                </div>
                {r.trend.buckets.length <= 16 && (
                  <span className="text-[0.6rem] text-muted">{b.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" />Krijuar</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Përfunduar</span>
          </div>
        </section>
      </div>

      <section className="surface-card min-w-0 p-4 sm:p-5 print:break-inside-avoid print:p-3">
        <SectionHead
          title="Sipas drejtorisë / agjencisë"
          hint="Sa kërkesa janë gjeneruar për secilën njësi dhe si janë trajtuar"
          filter={filter}
          type="units"
        />
        <ul className="mt-4 space-y-2.5 md:hidden print:hidden">
          {r.byUnit.length === 0 && <li className="py-4 text-center text-sm text-muted">Nuk ka të dhëna për këtë periudhë.</li>}
          {r.byUnit.map((u) => (
            <li key={u.name} className="rounded-xl border border-line bg-bg/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold leading-snug">{shortOrgUnit(u.name)}</p>
                <p className="shrink-0 text-lg font-extrabold tabular-nums">{u.total}</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(u.total / maxUnit) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[0.7rem]">
                {r.statuses.map((s) =>
                  u.byStatus[s] ? (
                    <span key={s} className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_BADGE[s]}`}>
                      {STATUS_LABELS[s]}: {u.byStatus[s]}
                    </span>
                  ) : null,
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                {u.completionRate}% zgjidhje · koha mes. {formatDuration(u.avgResolutionHours)} · {u.citizen} qytetarë
                {u.overdue ? <span className="font-semibold text-brand"> · {u.overdue} me vonesë</span> : null}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 hidden overflow-x-auto md:block print:block print:overflow-visible">
          <table className="min-w-full text-sm print:text-xs">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">Njësia</th>
                <th className="px-2 py-2 text-right font-semibold">Totali</th>
                {r.statuses.map((s) => (
                  <th key={s} className="px-2 py-2 text-right font-semibold">{STATUS_LABELS[s]}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold">Qytetarë</th>
                <th className="px-2 py-2 text-right font-semibold">Vonesa</th>
                <th className="px-2 py-2 text-right font-semibold">% Zgjidhje</th>
                <th className="py-2 pl-2 text-right font-semibold">Koha mes.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.byUnit.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center text-muted">Nuk ka të dhëna për këtë periudhë.</td></tr>
              )}
              {r.byUnit.map((u) => (
                <tr key={u.name} className="align-middle">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium" title={u.name}>{shortOrgUnit(u.name)}</p>
                    <div className="mt-1 h-1.5 w-full max-w-[14rem] rounded-full bg-zinc-100">
                      <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(u.total / maxUnit) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold tabular-nums">{u.total}</td>
                  {r.statuses.map((s) => (
                    <td key={s} className="px-2 py-2.5 text-right tabular-nums">{u.byStatus[s]}</td>
                  ))}
                  <td className="px-2 py-2.5 text-right tabular-nums">{u.citizen}</td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${u.overdue ? "font-semibold text-brand" : ""}`}>{u.overdue}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{u.completionRate}%</td>
                  <td className="py-2.5 pl-2 text-right whitespace-nowrap">{formatDuration(u.avgResolutionHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 print:gap-3">
        <section className="surface-card min-w-0 p-4 sm:p-5 print:break-inside-avoid print:p-3">
          <SectionHead
            title="Sa ka gjeneruar secili"
            hint="Kërkesat sipas personit që i regjistroi"
            filter={filter}
            type="creators"
          />
          <div className="mt-4 overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Gjeneruar nga</th>
                  <th className="px-2 py-2 text-right font-semibold">Totali</th>
                  <th className="px-2 py-2 text-right font-semibold">Përfunduar</th>
                  <th className="px-2 py-2 text-right font-semibold">Të hapura</th>
                  <th className="py-2 pl-2 text-right font-semibold">% e totalit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.byCreator.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted">Nuk ka të dhëna.</td></tr>
                )}
                {r.byCreator.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">{c.total}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.completed}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.open}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{c.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5 print:break-inside-avoid print:p-3">
          <SectionHead
            title="Aktiviteti i përdoruesve"
            hint="Veprimet e kryera në periudhë (krijime, statuse, ri-delegime, komente, dokumente)"
            filter={filter}
            type="activity"
          />
          <div className="mt-4 overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Përdoruesi</th>
                  <th className="px-2 py-2 text-right font-semibold">Krijime</th>
                  <th className="px-2 py-2 text-right font-semibold">Statuse</th>
                  <th className="px-2 py-2 text-right font-semibold">Ri-deleg.</th>
                  <th className="px-2 py-2 text-right font-semibold">Komente</th>
                  <th className="px-2 py-2 text-right font-semibold">Dok.</th>
                  <th className="px-2 py-2 text-right font-semibold">Përgjigje</th>
                  <th className="py-2 pl-2 text-right font-semibold">Totali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.activity.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-muted">Nuk ka aktivitet.</td></tr>
                )}
                {r.activity.map((a) => (
                  <tr key={a.name}>
                    <td className="py-2.5 pr-3 font-medium">{a.name}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.created}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.status}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.redelegated}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.comments}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.documents}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{a.responses}</td>
                    <td className="py-2.5 pl-2 text-right font-bold tabular-nums">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="surface-card min-w-0 p-4 sm:p-5 print:p-3">
        <SectionHead
          title={`Lista e kërkesave (${r.tasks.length})`}
          hint={r.tasks.length > 200 ? "Shfaqen 200 të fundit — shkarkoni Excel për listën e plotë" : undefined}
          filter={filter}
          type="tasks"
        />
        <ul className="mt-4 divide-y divide-line md:hidden print:hidden">
          {r.tasks.length === 0 && <li className="py-4 text-center text-sm text-muted">Nuk ka kërkesa për këto filtra.</li>}
          {r.tasks.slice(0, 200).map((task) => (
            <li key={task.id}>
              <Link href={`/panel/detyra/${task.id}`} className="block py-3 active:bg-bg">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-brand">{task.number}</span>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${STATUS_BADGE[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {format(new Date(task.createdAt), "dd.MM.yyyy")} · {task.orgUnit ? shortOrgUnit(task.orgUnit) : "Pa delegim"}
                  {" · "}
                  {task.creatorId ? task.creatorName : "Qytetar (publik)"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 hidden overflow-x-auto md:block print:block print:overflow-visible">
          <table className="min-w-full text-sm print:text-xs">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">ID</th>
                <th className="px-2 py-2 font-semibold">Data</th>
                <th className="px-2 py-2 font-semibold">Titulli</th>
                <th className="px-2 py-2 font-semibold">Njësia</th>
                <th className="px-2 py-2 font-semibold">Statusi</th>
                <th className="px-2 py-2 font-semibold">Gjeneruar nga</th>
                <th className="py-2 pl-2 text-right font-semibold">Koha e zgjidhjes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.tasks.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted">Nuk ka kërkesa për këto filtra.</td></tr>
              )}
              {r.tasks.slice(0, 200).map((task) => (
                <tr key={task.id} className="align-top print:break-inside-avoid">
                  <td className="whitespace-nowrap py-2.5 pr-3 print:py-1.5">
                    <Link href={`/panel/detyra/${task.id}`} className="font-mono text-xs font-bold text-brand hover:underline">
                      {task.number}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-muted">{format(new Date(task.createdAt), "dd.MM.yyyy")}</td>
                  <td className="px-2 py-2.5">
                    <span className="line-clamp-2 max-w-xs print:line-clamp-none print:max-w-none">{task.title}</span>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap print:whitespace-normal">{task.orgUnit ? shortOrgUnit(task.orgUnit) : "—"}</td>
                  <td className="px-2 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-muted">
                    {task.creatorId ? task.creatorName : "Qytetar (publik)"}
                  </td>
                  <td className="py-2.5 pl-2 text-right whitespace-nowrap">{formatDuration(r.resolutionHours(task))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

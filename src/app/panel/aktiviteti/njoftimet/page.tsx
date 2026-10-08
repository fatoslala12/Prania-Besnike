import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle, Bell, CheckCheck, Clock3, Info, Mail, MailX, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { ROLE_LABELS, canViewActivity } from "@/lib/constants";
import {
  FETCH_LIMIT,
  NOTIFICATION_KIND_LABELS,
  buildNotificationStats,
  formatHours,
  parsePeriod,
  periodPresets,
  periodRange,
} from "@/lib/activity";
import { listAuditLogs, listNotificationStats, listUsers } from "@/lib/repo";
import { ActivityTabs, CHART_COLORS, Donut, Empty, Kpi, SectionHead, ago, initials } from "@/components/activity-ui";

export const metadata = { title: "Njoftimet" };

const INSIGHT_STYLE = {
  ok: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CheckCheck, iconCls: "text-emerald-600" },
  warn: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: TriangleAlert, iconCls: "text-amber-600" },
  bad: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: AlertCircle, iconCls: "text-rose-600" },
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: Info, iconCls: "text-sky-600" },
} as const;

export default async function NotificationsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewActivity(session.user.role)) redirect("/panel/dashboard");

  const p = parsePeriod(await searchParams, 30);
  const range = periodRange(p);
  const [notes, logs, users] = await Promise.all([
    listNotificationStats(range),
    listAuditLogs(range, FETCH_LIMIT),
    listUsers(),
  ]);
  const emails = logs.filter((l) => l.module === "EMAIL");
  const s = buildNotificationStats(notes, emails, users, p);
  const now = new Date();
  const presets = periodPresets();
  const base = "/panel/aktiviteti/njoftimet";

  const maxDay = Math.max(1, ...s.daily.map((d) => Math.max(d.total, d.emails + d.emailFails)));
  const maxRole = Math.max(1, ...s.byRole.map((r) => r.total));
  const kindParts = s.byKind.map((k, i) => ({ label: NOTIFICATION_KIND_LABELS[k.kind], value: k.total, color: CHART_COLORS[i] }));
  const showDayLabels = s.daily.length <= 14;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Siguria & auditimi</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Njoftimet</h1>
          <p className="mt-1 text-sm text-muted">
            {format(new Date(`${p.from}T00:00:00`), "dd.MM.yyyy")} – {format(new Date(`${p.to}T00:00:00`), "dd.MM.yyyy")}
            {" · "}njoftimet në panel dhe email-et e dërguara
          </p>
        </div>
        <ActivityTabs active="notifications" query={`from=${p.from}&to=${p.to}`} />
      </div>

      <form className="surface-card flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {presets.map((x) => {
            const on = p.from === x.from && p.to === x.to;
            return (
              <Link
                key={x.label}
                href={`${base}?from=${x.from}&to=${x.to}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink/70 hover:border-brand hover:text-brand"
                }`}
              >
                {x.label}
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div className="min-w-0">
            <label className="label" htmlFor="from">Nga</label>
            <input id="from" name="from" type="date" defaultValue={p.from} className="field" />
          </div>
          <div className="min-w-0">
            <label className="label" htmlFor="to">Deri</label>
            <input id="to" name="to" type="date" defaultValue={p.to} className="field" />
          </div>
          <button type="submit" className="btn-primary col-span-2 !px-4 !py-2.5 text-sm sm:col-span-1">Shfaq</button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Njoftime gjithsej" value={s.kpis.total} sub={`për ${s.kpis.recipients} përdorues`} icon={Bell} />
        <Kpi label="Të lexuara" value={`${s.kpis.readRate}%`} sub={`${s.kpis.read} nga ${s.kpis.total}`} tone={s.kpis.total && s.kpis.readRate < 50 ? "warn" : "ok"} icon={CheckCheck} />
        <Kpi label="Pa u lexuar" value={s.kpis.unread} sub="ende në kambanë" tone={s.kpis.unread ? "warn" : "default"} icon={Bell} />
        <Kpi label="Koha e leximit" value={formatHours(s.kpis.medianReadHours)} sub={`mediana · mesatarja ${formatHours(s.kpis.avgReadHours)}`} icon={Clock3} />
        <Kpi label="Email të dërguar" value={s.kpis.emailsSent} sub="te stafi dhe qytetarët" tone="ok" icon={Mail} />
        <Kpi label="Email të dështuar" value={s.kpis.emailsFailed} sub={s.kpis.emailsFailed ? "shiko listën më poshtë" : "asnjë problem"} tone={s.kpis.emailsFailed ? "bad" : "default"} icon={MailX} />
      </div>

      {s.insights.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {s.insights.map((x) => {
            const st = INSIGHT_STYLE[x.tone];
            const Icon = st.icon;
            return (
              <div key={x.title} className={`flex gap-3 rounded-2xl border p-4 text-sm ${st.box}`}>
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${st.iconCls}`} />
                <div className="min-w-0">
                  <p className="font-bold">{x.title}</p>
                  <p className="mt-0.5 opacity-90">{x.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Njoftimet ditë pas dite" hint="Krijuar vs. lexuar, dhe email-et e dërguara" />
          {s.kpis.total === 0 && s.kpis.emailsSent + s.kpis.emailsFailed === 0 ? (
            <div className="mt-4"><Empty>Nuk ka njoftime në këtë periudhë.</Empty></div>
          ) : (
            <div dir="rtl" className="no-scrollbar mt-4 flex h-48 flex-row-reverse items-end gap-[3px] overflow-x-auto pb-1">
              {s.daily.map((d) => (
                <div
                  key={d.key}
                  dir="ltr"
                  className="flex h-full min-w-[8px] flex-1 flex-col items-center justify-end gap-1"
                  title={`${d.label}: ${d.total} njoftime · ${d.read} lexuar · ${d.emails} email${d.emailFails ? ` · ${d.emailFails} dështuar` : ""}`}
                >
                  <div className="flex h-[80%] w-full items-end justify-center gap-[2px]">
                    <div className="relative w-1/2 max-w-4 overflow-hidden rounded-t bg-brand/25" style={{ height: `${(d.total / maxDay) * 100}%` }}>
                      <div className="absolute inset-x-0 bottom-0 bg-brand" style={{ height: d.total ? `${(d.read / d.total) * 100}%` : 0 }} />
                    </div>
                    <div className="flex w-1/2 max-w-4 flex-col-reverse overflow-hidden rounded-t" style={{ height: `${((d.emails + d.emailFails) / maxDay) * 100}%` }}>
                      <div className="bg-sky-500" style={{ flexGrow: d.emails }} />
                      <div className="bg-rose-500" style={{ flexGrow: d.emailFails }} />
                    </div>
                  </div>
                  {showDayLabels && <span className="text-[0.6rem] text-muted">{d.label}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" />Lexuar</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand/25" />Pa lexuar</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />Email</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Email i dështuar</span>
          </div>
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Sipas llojit" hint="Çfarë njoftohet më shumë" />
          {s.byKind.length === 0 ? (
            <div className="mt-4"><Empty>Pa të dhëna.</Empty></div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <Donut parts={kindParts} center={s.kpis.total} centerSub="njoftime" />
              <ul className="w-full min-w-0 space-y-1.5">
                {s.byKind.map((k, i) => (
                  <li key={k.kind} className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i] }} />
                      <span className="truncate">{NOTIFICATION_KIND_LABELS[k.kind]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <b>{k.total}</b>
                      <span className="ml-1.5 text-muted">{k.readRate}% lexuar</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Sipas rolit të marrësit" hint="Pjesa e errët = e lexuar" />
          {s.byRole.length === 0 ? (
            <div className="mt-4"><Empty>Pa të dhëna.</Empty></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {s.byRole.map((r) => (
                <li key={r.role}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{ROLE_LABELS[r.role]}</span>
                    <span className="shrink-0 tabular-nums">
                      <b>{r.total}</b>
                      <span className="ml-1.5 text-xs text-muted">{Math.round((r.read * 100) / r.total)}% lexuar</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-100">
                    <div className="relative h-2 overflow-hidden rounded-full bg-brand/25" style={{ width: `${(r.total / maxRole) * 100}%` }}>
                      <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${(r.read / r.total) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Kush ka më shumë të palexuara" hint="Mund të kenë nevojë për një kujtesë" />
          {s.topUnread.length === 0 ? (
            <div className="mt-4"><Empty>Të gjithë i kanë lexuar njoftimet.</Empty></div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {s.topUnread.map((u) => (
                <li key={u.userId} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(u.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.role ? ROLE_LABELS[u.role] : "—"} · {u.total} gjithsej</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${u.unread >= 10 ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-800"}`}>
                    {u.unread}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="surface-card min-w-0 p-4 sm:p-5">
        <SectionHead
          title="Email-et e dështuara"
          hint="Të fundit; arsyeja vjen nga serveri i postës"
          right={
            s.kpis.emailsFailed > 0 ? (
              <Link href={`/panel/aktiviteti?from=${p.from}&to=${p.to}&action=EMAIL_FAILED`} className="text-xs font-semibold text-brand hover:underline">
                Shiko në regjistër
              </Link>
            ) : undefined
          }
        />
        {s.recentFailures.length === 0 ? (
          <div className="mt-4"><Empty>{s.kpis.emailsSent ? "Asnjë email i dështuar." : "Nuk ka email-e në këtë periudhë."}</Empty></div>
        ) : (
          <>
            {s.failReasons.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.failReasons.map((r) => (
                  <span key={r.reason} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    {r.reason} · {r.count}
                  </span>
                ))}
              </div>
            )}
            <ul className="mt-3 divide-y divide-line">
              {s.recentFailures.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold">{e.targetLabel ?? "—"}</p>
                    <span className="shrink-0 text-[0.7rem] text-muted">{ago(e.createdAt, now)}</span>
                  </div>
                  {e.details && <p className="mt-0.5 line-clamp-1 text-xs text-ink/70">{e.details}</p>}
                  {e.reason && <p className="mt-0.5 line-clamp-2 text-xs font-medium text-rose-700">{e.reason}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

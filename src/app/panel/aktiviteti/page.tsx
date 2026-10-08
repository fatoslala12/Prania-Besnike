import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Download,
  Globe2,
  KeyRound,
  LogIn,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { ROLE_LABELS, canViewActivity } from "@/lib/constants";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_RETENTION_DAYS,
  actionLabel,
  parseUserAgent,
  reasonLabel,
  type AuditModule,
} from "@/lib/audit-catalog";
import {
  FETCH_LIMIT,
  SUSPICIOUS_FAILS,
  activityQuery,
  buildActivity,
  parseActivityFilter,
  periodPresets,
  periodRange,
  type ActiveUser,
} from "@/lib/activity";
import { listAuditLogs } from "@/lib/repo";
import { MobileFilters } from "@/components/MobileFilters";
import {
  ActivityTabs,
  CHART_COLORS,
  DeviceBadge,
  Donut,
  Empty,
  Kpi,
  Pager,
  SectionHead,
  ago,
  initials,
} from "@/components/activity-ui";
import type { AuditEntry, Role } from "@/lib/types";

export const metadata = { title: "Aktiviteti" };

const roleLabel = (r: string | null) => (r && r in ROLE_LABELS ? ROLE_LABELS[r as Role] : r ?? "");

function ActionBadge({ l }: { l: AuditEntry }) {
  const cls = !l.success
    ? "bg-rose-50 text-rose-700 ring-rose-200"
    : l.action === "LOGIN_SUCCESS"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : l.module === "USERS" || l.module === "ORG_UNITS"
        ? "bg-violet-50 text-violet-700 ring-violet-200"
        : "bg-zinc-50 text-ink/75 ring-zinc-200";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${cls}`}>
      {actionLabel(l.action)}
    </span>
  );
}

const USERS_SHOWN = 6;

function UserCard({ u, now, href }: { u: ActiveUser; now: Date; href: (patch: { q: string }) => string }) {
  const online = now.getTime() - Date.parse(u.lastSeenAt) < 30 * 60 * 1000;
  return (
    <li className="rounded-xl border border-line bg-bg/40 p-3">
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
          {initials(u.name)}
          {online && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" title="Aktiv në 30 minutat e fundit" />}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={href({ q: u.name })} className="block truncate text-sm font-semibold hover:text-brand">{u.name}</Link>
          <p className="truncate text-xs text-brand">{roleLabel(u.role)}</p>
        </div>
        <span className="shrink-0 text-right text-[0.7rem] text-muted">{ago(u.lastSeenAt, now)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted">IP e fundit</span>
        <Link href={href({ q: u.ip ?? "" })} className="truncate text-right font-mono font-semibold hover:text-brand">{u.ip ?? "—"}</Link>
        <span className="text-muted">Pajisja</span>
        <span className="flex justify-end"><DeviceBadge device={u.device} compact /></span>
        <span className="text-muted">Hyrje · IP</span>
        <span className="text-right font-semibold tabular-nums">
          {u.logins} · {u.ips}
          {u.ips > 3 && <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" aria-label="Shumë IP të ndryshme" />}
        </span>
      </div>
      <p className="mt-2 truncate text-[0.7rem] text-muted">{u.device.os} · hyrja e fundit {format(new Date(u.lastLoginAt), "dd.MM HH:mm")}</p>
    </li>
  );
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewActivity(session.user.role)) redirect("/panel/dashboard");

  const f = parseActivityFilter(await searchParams);
  const logs = await listAuditLogs(periodRange(f), FETCH_LIMIT);
  const a = buildActivity(logs, f);
  const now = new Date();
  const presets = periodPresets();
  const href = (patch: Parameters<typeof activityQuery>[1]) => `/panel/aktiviteti?${activityQuery(f, { page: 1, ...patch })}`;
  const activeFilters = [f.module, f.action, f.status, f.q].filter(Boolean).length;
  const adminChanges = a.byAction
    .filter((x) => x.action.startsWith("USER_") || x.action.startsWith("ORG_UNIT_"))
    .reduce((s, x) => s + x.count, 0);

  const maxDay = Math.max(1, ...a.daily.map((d) => d.ok + d.fail + d.other));
  const maxHour = Math.max(1, ...a.byHour.map((h) => h.ok + h.fail));
  const maxReason = Math.max(1, ...a.reasons.map((r) => r.count));
  const topActions = a.byAction.slice(0, 6);
  const restActions = a.byAction.slice(6).reduce((s, x) => s + x.count, 0);
  const donutParts = [
    ...topActions.map((x, i) => ({ label: actionLabel(x.action), value: x.count, color: CHART_COLORS[i] })),
    ...(restActions ? [{ label: "Të tjera", value: restActions, color: CHART_COLORS[7] }] : []),
  ];
  const suspicious = a.failingIps.filter((ip) => ip.suspicious);
  const showDayLabels = a.daily.length <= 14;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Siguria & auditimi</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Aktiviteti</h1>
          <p className="mt-1 text-sm text-muted">
            {format(new Date(`${f.from}T00:00:00`), "dd.MM.yyyy")} – {format(new Date(`${f.to}T00:00:00`), "dd.MM.yyyy")}
            {" · "}të dhënat ruhen {AUDIT_RETENTION_DAYS} ditë
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 sm:flex-none">
            <ActivityTabs active="activity" query={`from=${f.from}&to=${f.to}`} />
          </div>
          <a
            href={`/api/aktiviteti/export?${activityQuery(f, { page: 1 })}`}
            className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 !px-3.5 !py-2.5 text-sm"
            title="Eksporto regjistrin (CSV)"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
        </div>
      </div>

      <form className="surface-card space-y-4 p-4 sm:p-5">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {presets.map((p) => {
            const on = f.from === p.from && f.to === p.to;
            return (
              <Link
                key={p.label}
                href={href({ from: p.from, to: p.to })}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink/70 hover:border-brand hover:text-brand"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
          <Link
            href={href({ action: "LOGIN_FAILED", module: "" })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              f.action === "LOGIN_FAILED" ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400"
            }`}
          >
            Vetëm hyrjet e dështuara
          </Link>
        </div>
        <MobileFilters activeCount={activeFilters} label="Filtrat">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="q">Kërko</label>
              <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Emër, login, IP…" className="field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="from">Nga</label>
                <input id="from" name="from" type="date" defaultValue={f.from} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="to">Deri</label>
                <input id="to" name="to" type="date" defaultValue={f.to} className="field" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="status">Rezultati</label>
              <select id="status" name="status" defaultValue={f.status} className="field">
                <option value="">Të gjitha</option>
                <option value="ok">Me sukses</option>
                <option value="fail">Të dështuara</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="module">Moduli</label>
              <select id="module" name="module" defaultValue={f.module} className="field">
                <option value="">Të gjitha (pa email-et)</option>
                {(Object.keys(AUDIT_MODULES) as AuditModule[]).map((m) => (
                  <option key={m} value={m}>{AUDIT_MODULES[m]}</option>
                ))}
                <option value="ALL">Gjithçka (edhe email-et)</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label" htmlFor="action">Veprimi</label>
              <select id="action" name="action" defaultValue={f.action} className="field">
                <option value="">Të gjitha veprimet</option>
                {(Object.keys(AUDIT_MODULES) as AuditModule[]).map((m) => (
                  <optgroup key={m} label={AUDIT_MODULES[m]}>
                    {Object.entries(AUDIT_ACTIONS)
                      .filter(([, v]) => v.module === m)
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="btn-primary !py-2 text-sm">Apliko</button>
            <Link href="/panel/aktiviteti" className="btn-ghost !py-2 text-center text-sm">Pastro</Link>
          </div>
        </MobileFilters>
      </form>

      {(suspicious.length > 0 || a.kpis.failed24h >= SUSPICIOUS_FAILS) && (
        <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="min-w-0">
            <p className="font-bold">Kujdes: tentativa të shumta hyrjeje të dështuara</p>
            <p className="mt-0.5 text-rose-800">
              {a.kpis.failed24h} dështime në 24 orët e fundit
              {suspicious.length > 0 && (
                <>
                  {" · "}IP të dyshimta:{" "}
                  {suspicious.slice(0, 3).map((s, i) => (
                    <span key={s.ip}>
                      {i > 0 && ", "}
                      <Link href={href({ q: s.ip })} className="font-mono font-semibold underline">{s.ip}</Link> ({s.count})
                    </span>
                  ))}
                </>
              )}
              . Nëse nuk i njihni, ndryshoni fjalëkalimet e prekura.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Veprime gjithsej" value={a.kpis.total} sub={`${a.kpis.today} sot`} icon={Activity} />
        <Kpi label="Hyrje me sukses" value={a.kpis.logins} sub={`${a.kpis.activeUsers} përdorues të ndryshëm`} tone="ok" icon={LogIn} />
        <Kpi
          label="Hyrje të dështuara"
          value={a.kpis.failed}
          sub={`${a.kpis.failRate}% e tentativave · ${a.kpis.failed24h} në 24 orë`}
          tone={a.kpis.failed ? "bad" : "default"}
          icon={KeyRound}
        />
        <Kpi label="Përdorues aktivë" value={a.kpis.activeUsers} sub="që kanë hyrë në periudhë" icon={Users} />
        <Kpi
          label="IP të ndryshme"
          value={a.kpis.ips}
          sub={suspicious.length ? `${suspicious.length} të dyshimta` : "asnjë e dyshimtë"}
          tone={suspicious.length ? "warn" : "default"}
          icon={Globe2}
        />
        <Kpi label="Ndryshime administrative" value={adminChanges} sub="përdorues, role, drejtori" icon={UserCog} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Aktiviteti ditor" hint="Hyrje me sukses, të dështuara dhe veprime të tjera" />
          {a.kpis.total === 0 ? (
            <div className="mt-4"><Empty>Nuk ka aktivitet në këtë periudhë.</Empty></div>
          ) : (
            <div dir="rtl" className="no-scrollbar mt-4 flex h-48 flex-row-reverse items-end gap-[3px] overflow-x-auto pb-1">
              {a.daily.map((d) => {
                const sum = d.ok + d.fail + d.other;
                return (
                  <div
                    key={d.key}
                    dir="ltr"
                    className="flex h-full min-w-[8px] flex-1 flex-col items-center justify-end gap-1"
                    title={`${d.label}: ${d.ok} hyrje · ${d.fail} të dështuara · ${d.other} veprime`}
                  >
                    {showDayLabels && sum > 0 && <span className="text-[0.6rem] font-semibold tabular-nums text-ink/60">{sum}</span>}
                    <div className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(sum / maxDay) * 75}%` }}>
                      <div className="bg-emerald-500" style={{ flexGrow: d.ok }} />
                      <div className="bg-rose-500" style={{ flexGrow: d.fail }} />
                      <div className="bg-zinc-300" style={{ flexGrow: d.other }} />
                    </div>
                    {showDayLabels && <span className="text-[0.6rem] text-muted">{d.label}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Hyrje</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Të dështuara</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-300" />Veprime të tjera</span>
          </div>
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Çfarë bëhet më shumë" hint="Shpërndarja e veprimeve" />
          {a.kpis.total === 0 ? (
            <div className="mt-4"><Empty>Pa të dhëna.</Empty></div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <Donut parts={donutParts} center={a.kpis.total} centerSub="veprime" />
              <ul className="w-full min-w-0 space-y-1.5">
                {donutParts.map((p) => (
                  <li key={p.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate">{p.label}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead title="Orët e hyrjeve" hint="Kur hyjnë përdoruesit gjatë ditës" />
          <div className="mt-4 grid grid-cols-12 gap-1">
            {a.byHour.map((h) => {
              const sum = h.ok + h.fail;
              const alpha = sum ? 0.15 + (sum / maxHour) * 0.85 : 0;
              return (
                <div key={h.hour} className="flex flex-col items-center gap-0.5" title={`${String(h.hour).padStart(2, "0")}:00 — ${h.ok} hyrje, ${h.fail} të dështuara`}>
                  <div
                    className={`flex aspect-square w-full items-center justify-center rounded-md text-[0.6rem] font-bold ${sum ? "text-white" : "text-ink/25"} ${h.fail > h.ok ? "ring-2 ring-rose-400" : ""}`}
                    style={{ background: sum ? `rgba(166, 50, 64, ${alpha})` : "#f4f4f5" }}
                  >
                    {sum || ""}
                  </div>
                  <span className="text-[0.55rem] tabular-nums text-muted">{String(h.hour).padStart(2, "0")}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Kutitë me kornizë të kuqe kanë më shumë dështime se hyrje të suksesshme.</p>
        </section>

        <section className="surface-card min-w-0 p-4 sm:p-5">
          <SectionHead
            title="Pse dështojnë hyrjet"
            hint={`${a.kpis.failed} tentativa të dështuara`}
            right={
              a.kpis.failed > 0 ? (
                <Link href={href({ action: "LOGIN_FAILED", module: "" })} className="text-xs font-semibold text-brand hover:underline">Shiko të gjitha</Link>
              ) : undefined
            }
          />
          {a.reasons.length === 0 ? (
            <div className="mt-4"><Empty>Asnjë hyrje e dështuar në këtë periudhë.</Empty></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {a.reasons.map((r) => (
                <li key={r.reason}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{reasonLabel(r.reason)}</span>
                    <span className="font-semibold tabular-nums">{r.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-100">
                    <div className="h-2 rounded-full bg-rose-500" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {a.kpis.failed > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface-card min-w-0 p-4 sm:p-5">
            <SectionHead title="IP me më shumë dështime" hint={`${SUSPICIOUS_FAILS}+ dështime = e dyshimtë`} />
            <ul className="mt-3 divide-y divide-line">
              {a.failingIps.map((ip) => (
                <li key={ip.ip} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={href({ q: ip.ip })} className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-brand">
                      {ip.suspicious && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                      {ip.ip}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {ip.logins.length ? ip.logins.slice(0, 3).join(", ") : "pa login"}
                      {ip.logins.length > 3 && ` +${ip.logins.length - 3}`} · {ago(ip.lastAt, now)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${ip.suspicious ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"}`}>
                    {ip.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface-card min-w-0 p-4 sm:p-5">
            <SectionHead title="Llogaritë e tentuara" hint="Me cilin login u provua pa sukses" />
            <ul className="mt-3 divide-y divide-line">
              {a.failingLogins.map((l) => (
                <li key={l.login} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={href({ q: l.login })} className="block truncate text-sm font-semibold hover:text-brand">{l.login}</Link>
                    <p className="text-xs text-muted">{l.known ? "Llogari ekzistuese" : "Nuk ekziston në sistem"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-rose-700">{l.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="surface-card min-w-0 p-4 sm:p-5">
        <SectionHead title="Përdoruesit aktivë" hint="Kush ka hyrë në periudhë, nga cila IP dhe pajisje" />
        {a.activeUsers.length === 0 ? (
          <div className="mt-4"><Empty>Askush nuk ka hyrë në këtë periudhë.</Empty></div>
        ) : (
          <>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {a.activeUsers.slice(0, USERS_SHOWN).map((u) => (
                <UserCard key={u.userId} u={u} now={now} href={href} />
              ))}
            </ul>
            {a.activeUsers.length > USERS_SHOWN && (
              <details className="group mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand hover:text-brand">
                  <span className="group-open:hidden">Shfaq edhe {a.activeUsers.length - USERS_SHOWN} të tjerë</span>
                  <span className="hidden group-open:inline">Fshih</span>
                </summary>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {a.activeUsers.slice(USERS_SHOWN, 60).map((u) => (
                    <UserCard key={u.userId} u={u} now={now} href={href} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section className="surface-card min-w-0 p-4 sm:p-5" id="regjistri">
        <SectionHead
          title={`Regjistri (${a.filtered.length})`}
          hint={activeFilters ? "Sipas filtrave të zgjedhur" : "Të gjitha veprimet, më të rejat sipër"}
        />
        {a.rows.length === 0 ? (
          <div className="mt-4"><Empty>Asnjë veprim për këto filtra.</Empty></div>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line md:hidden">
              {a.rows.map((l) => {
                const dev = parseUserAgent(l.userAgent);
                return (
                  <li key={l.id} className={`py-3 ${l.success ? "" : "-mx-2 rounded-lg bg-rose-50/60 px-2"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <ActionBadge l={l} />
                      <span className="shrink-0 text-[0.7rem] tabular-nums text-muted">{format(new Date(l.createdAt), "dd.MM HH:mm")}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">
                      {l.userName ?? l.login ?? (l.module === "EMAIL" ? "Sistemi" : "I panjohur")}
                      {l.role && <span className="ml-1.5 text-xs font-medium text-brand">{roleLabel(l.role)}</span>}
                    </p>
                    {(l.targetLabel || l.details) && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink/70">
                        {l.targetLabel}
                        {l.targetLabel && l.details && " — "}
                        {l.details}
                      </p>
                    )}
                    {!l.success && l.reason && <p className="mt-0.5 text-xs font-semibold text-rose-700">{reasonLabel(l.reason)}</p>}
                    {(l.ip || l.userAgent) && (
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                        {l.ip && <Link href={href({ q: l.ip })} className="font-mono">{l.ip}</Link>}
                        {l.userAgent && <DeviceBadge device={dev} compact />}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-semibold">Koha</th>
                    <th className="px-2 py-2 font-semibold">Përdoruesi</th>
                    <th className="px-2 py-2 font-semibold">Veprimi</th>
                    <th className="px-2 py-2 font-semibold">Detaje</th>
                    <th className="px-2 py-2 font-semibold">IP</th>
                    <th className="py-2 pl-2 font-semibold">Pajisja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {a.rows.map((l) => (
                    <tr key={l.id} className={`align-top ${l.success ? "" : "bg-rose-50/50"}`}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className="block tabular-nums">{format(new Date(l.createdAt), "dd.MM.yyyy")}</span>
                        <span className="block text-xs tabular-nums text-muted">{format(new Date(l.createdAt), "HH:mm:ss")}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="block max-w-[12rem] truncate font-medium">{l.userName ?? l.login ?? (l.module === "EMAIL" ? "Sistemi" : "—")}</span>
                        <span className="block max-w-[12rem] truncate text-xs text-brand">
                          {roleLabel(l.role) || (l.login && l.userName ? l.login : "")}
                        </span>
                      </td>
                      <td className="px-2 py-2.5"><ActionBadge l={l} /></td>
                      <td className="px-2 py-2.5">
                        <span className="line-clamp-2 max-w-sm text-ink/80">
                          {l.targetLabel}
                          {l.targetLabel && l.details && " — "}
                          {l.details}
                          {!l.targetLabel && !l.details && l.login && !l.userName ? `Login: ${l.login}` : ""}
                        </span>
                        {!l.success && l.reason && <span className="block text-xs font-semibold text-rose-700">{reasonLabel(l.reason)}</span>}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        {l.ip ? <Link href={href({ q: l.ip })} className="font-mono text-xs hover:text-brand">{l.ip}</Link> : <span className="text-muted">—</span>}
                      </td>
                      <td className="py-2.5 pl-2">
                        {l.userAgent ? <DeviceBadge device={parseUserAgent(l.userAgent)} /> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={a.page} pages={a.pages} href={(p) => `/panel/aktiviteti?${activityQuery(f, { page: p })}#regjistri`} />
          </>
        )}
        {logs.length >= FETCH_LIMIT && (
          <p className="mt-3 text-xs text-amber-700">Periudha ka shumë të dhëna; shfaqen {FETCH_LIMIT} veprimet më të reja. Ngushtoni datat.</p>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardList,
  UserX,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  CircleDot,
  ArrowRight,
} from "lucide-react";
import { accessOf, requireSession } from "@/lib/auth-helpers";
import { STATUS_LABELS, canCreateTask, canSeeAllTasks } from "@/lib/constants";
import { getDashboardStats } from "@/lib/repo";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();

  const stats = await getDashboardStats(
    canSeeAllTasks(session.user.role) ? undefined : accessOf(session),
  );

  const maxDay = Math.max(1, ...stats.last7.map((d) => d.count));
  const maxMinistry = Math.max(1, ...stats.ministries.map((m) => m.count), 1);

  const cards = [
    {
      label: "Gjithsej detyra",
      value: stats.total,
      icon: ClipboardList,
      tone: "bg-brand text-white",
    },
    {
      label: "Pa delegim",
      value: stats.unassigned,
      icon: UserX,
      tone: "bg-amber-500 text-white",
    },
    {
      label: "Nga qytetarët",
      value: stats.citizen,
      icon: Users,
      tone: "bg-ink text-white",
    },
    {
      label: "Me dokumente",
      value: stats.withDocs,
      icon: FileText,
      tone: "bg-emerald-600 text-white",
    },
  ];

  const statusIcons = {
    I_RI: CircleDot,
    NE_PROCES: Clock,
    PERFUNDUAR: CheckCircle2,
    BLOKUAR: Ban,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="section-kicker">Pasqyra</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Statistika të gjalla nga detyrat
            {canSeeAllTasks(session.user.role) ? " e sistemit" : " tuaja"}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/panel" className="btn-ghost !py-2 text-center text-sm sm:w-auto">
            Shiko detyrat
          </Link>
          {canCreateTask(session.user.role) && (
            <Link
              href="/panel/detyra/e-re"
              className="btn-primary !py-2 text-center text-sm sm:w-auto"
            >
              + Detyrë e re
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="surface-card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(166,50,64,0.1)]"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.tone} transition group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold tabular-nums">{c.value}</p>
                <p className="text-xs font-medium text-muted">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5 md:p-6">
          <h2 className="text-lg font-bold">Sipas statusit</h2>
          <ul className="mt-4 space-y-3">
            {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(
              (key) => {
                const Icon = statusIcons[key];
                const count = stats.byStatus[key];
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <li key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 text-brand" />
                        {STATUS_LABELS[key]}
                      </span>
                      <span className="tabular-nums text-muted">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        </section>

        <section className="surface-card p-5 md:p-6">
          <h2 className="text-lg font-bold">7 ditët e fundit</h2>
          <p className="text-xs text-muted">Detyra të krijuara për ditë</p>
          <div className="mt-5 flex h-36 items-end gap-2">
            {stats.last7.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[0.65rem] font-semibold tabular-nums text-ink">
                  {d.count || ""}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-brand to-brand/70 transition hover:opacity-90"
                  style={{
                    height: `${Math.max(8, (d.count / maxDay) * 100)}%`,
                    minHeight: d.count ? undefined : 4,
                    opacity: d.count ? 1 : 0.25,
                  }}
                  title={`${d.label}: ${d.count}`}
                />
                <span className="text-[0.65rem] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5 md:p-6">
          <h2 className="text-lg font-bold">Sipas drejtorisë / agjencisë</h2>
          {stats.ministries.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nuk ka të dhëna ende.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {stats.ministries.map((m) => (
                <li key={m.name} className="flex items-center gap-2 text-sm sm:gap-3">
                  <span
                    className="w-24 shrink-0 truncate font-medium sm:w-40 md:w-44"
                    title={m.name}
                  >
                    {m.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-ink/80"
                      style={{
                        width: `${(m.count / maxMinistry) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-muted">
                    {m.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card p-5 md:p-6">
          <h2 className="text-lg font-bold">Ngarkesa e personave</h2>
          {stats.byAssignee.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Asnjë detyrë e caktuar ende.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {stats.byAssignee.map((a, i) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      {i + 1}
                    </span>
                    {a.name}
                  </span>
                  <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                    {a.count} detyra
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="surface-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Aktiviteti i fundit</h2>
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            Të gjitha
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {stats.recentEvents.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Ende nuk ka historik. Krijo ose ndrysho një detyrë.
          </p>
        ) : (
          <ul className="mt-4 space-y-0">
            {stats.recentEvents.map((e) => (
              <li
                key={e.id}
                className="flex gap-3 border-b border-line/70 py-3 last:border-0"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{e.message}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {e.taskTitle}
                    {" · "}
                    {e.actorName}
                    {" · "}
                    {format(new Date(e.createdAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
                {e.taskId && (
                  <Link
                    href={`/panel/detyra/${e.taskId}`}
                    className="shrink-0 self-center text-xs font-semibold text-brand hover:underline"
                  >
                    Hap
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

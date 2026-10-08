import Link from "next/link";
import { format } from "date-fns";
import { Building2, Paperclip } from "lucide-react";
import { accessOf, requireSession } from "@/lib/auth-helpers";
import {
  STATUS_LABELS,
  canCreateTask,
  canSeeAllTasks,
  shortOrgUnit,
} from "@/lib/constants";
import { isLocalMode, listOrgUnits, listTasks } from "@/lib/repo";
import type { TaskStatus } from "@/lib/types";

const statusStyle: Record<TaskStatus, string> = {
  I_RI: "bg-brand-soft text-brand",
  NE_PROCES: "bg-amber-50 text-amber-800",
  PERFUNDUAR: "bg-emerald-50 text-emerald-800",
  BLOKUAR: "bg-zinc-100 text-zinc-600",
};

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    orgUnit?: string;
    ridelegim?: string;
  }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const statusFilter =
    sp.status && sp.status in STATUS_LABELS
      ? (sp.status as TaskStatus)
      : undefined;
  const allUnits = (await listOrgUnits()).map((o) => o.name);
  const orgFilter = sp.orgUnit && allUnits.includes(sp.orgUnit) ? sp.orgUnit : undefined;

  const tasks = await listTasks({
    access: canSeeAllTasks(session.user) ? undefined : accessOf(session),
    status: statusFilter,
    orgUnit: orgFilter,
    q: q || undefined,
  });

  const unassigned = tasks.filter((t) => !t.orgUnit && !t.assigneeId).length;

  const orgOptions =
    !canSeeAllTasks(session.user) && session.user.orgUnit
      ? [session.user.orgUnit]
      : allUnits;

  return (
    <div>
      {sp.ridelegim === "ok" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Detyra u ri-delegua me sukses te drejtoria e re.
        </div>
      )}
      {isLocalMode() && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-2.5 text-sm text-brand sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4">
          <span>
            Mode lokal —{" "}
            <code className="font-semibold">.data/store.json</code>
          </span>
          <Link
            href="/panel/dashboard"
            className="font-bold underline underline-offset-2 hover:text-brand-dark"
          >
            Hap Dashboard →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Detyrat
          </h1>
          <p className="mt-1 text-sm text-muted">
            {canSeeAllTasks(session.user)
              ? `${tasks.length} detyra · ${unassigned} pa delegim`
              : `${tasks.length} detyra për njësinë / ju`}
          </p>
        </div>
        {canCreateTask(session.user.role) && (
          <Link
            href="/panel/detyra/e-re"
            className="btn-primary btn-block-mobile w-full sm:w-auto"
          >
            + Detyrë e re
          </Link>
        )}
      </div>

      <form className="mt-5 grid gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Kërko ID, titull..."
          className="field sm:max-w-xs"
        />
        <select
          name="status"
          defaultValue={sp.status || ""}
          className="field sm:max-w-[180px]"
        >
          <option value="">Të gjitha statuset</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="orgUnit"
          defaultValue={sp.orgUnit || ""}
          className="field sm:max-w-[260px]"
        >
          <option value="">Të gjitha drejtoritë</option>
          {orgOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn-ghost !py-2 flex-1 sm:flex-none">
            Filtro
          </button>
          {(sp.q || sp.status || sp.orgUnit) && (
            <Link
              href="/panel"
              className="btn-ghost !py-2 flex-1 text-center text-sm sm:flex-none"
            >
              Pastro
            </Link>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-3 sm:mt-6">
        {tasks.length === 0 && (
          <div className="surface-card p-8 text-center text-muted sm:p-10">
            Nuk ka detyra për të shfaqur.
          </div>
        )}
        {tasks.map((task) => {
          const unit = task.orgUnit;
          return (
            <Link
              key={task.id}
              href={`/panel/detyra/${task.id}`}
              className="surface-card group relative block overflow-hidden p-0 transition active:scale-[0.99] sm:hover:-translate-y-1 sm:hover:border-brand/30 sm:hover:shadow-[0_16px_40px_rgba(166,50,64,0.12)]"
            >
              {/* Mobile layout */}
              <div className="p-4 sm:hidden">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-gradient-to-br from-brand to-brand-dark px-2 py-1 font-mono text-[0.7rem] font-bold tracking-tight text-white">
                    {task.number || "—"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusStyle[task.status]}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                <h2 className="mt-2.5 text-base font-bold leading-snug text-ink">
                  {task.title}
                  {task.isCitizenRequest && (
                    <span className="ml-2 inline-block rounded-full bg-ink px-1.5 py-0.5 align-middle text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                      Qytetar
                    </span>
                  )}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {task.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[0.7rem] text-muted">
                  <span>
                    {format(new Date(task.createdAt), "dd.MM.yyyy HH:mm")}
                  </span>
                  {unit && (
                    <span className="inline-flex items-center gap-1 font-medium text-ink/75">
                      <Building2 className="h-3 w-3 text-brand" />
                      {shortOrgUnit(unit)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {task.documentsCount}
                  </span>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:flex sm:flex-row">
                <div className="flex w-36 shrink-0 flex-col items-center justify-center border-r border-line bg-gradient-to-br from-brand to-brand-dark px-4 py-5 text-white">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] opacity-80">
                    ID
                  </span>
                  <span className="font-mono text-base font-extrabold tracking-tight">
                    {task.number || "—"}
                  </span>
                </div>

                <div className="min-w-0 flex-1 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold group-hover:text-brand">
                          {task.title}
                        </h2>
                        {task.isCitizenRequest && (
                          <span className="rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                            Qytetar
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {task.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                    <span>
                      {format(new Date(task.createdAt), "dd.MM.yyyy HH:mm")}
                    </span>
                    {unit && (
                      <span className="inline-flex items-center gap-1 font-medium text-ink/75">
                        <Building2 className="h-3.5 w-3.5 text-brand" />
                        {shortOrgUnit(unit)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" />
                      {task.documentsCount} dokumente
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

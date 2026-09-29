"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  STATUS_LABELS,
  ROLE_LABELS,
  ORG_UNITS,
  canAssignTask,
  canRedelegate,
  shortOrgUnit,
} from "@/lib/constants";
import type { Role, TaskStatus } from "@/lib/types";

type Doc = {
  id: string;
  originalName: string;
  size: number;
  createdAt: string;
  uploadedBy: { name: string };
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; role: Role };
};

type HistoryItem = {
  id: string;
  type: string;
  message: string;
  actorName: string;
  actorRole?: Role | null;
  createdAt: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

type UserOption = {
  id: string;
  name: string;
  role?: Role;
  orgUnit?: string | null;
};

type Task = {
  id: string;
  number: string;
  title: string;
  description: string;
  status: TaskStatus;
  orgUnit: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  citizenPhone: string | null;
  requestDate: string | null;
  isCitizenRequest: boolean;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  creator: { name: string } | null;
  documents: Doc[];
  comments: Comment[];
  history?: HistoryItem[];
};

type Props = {
  task: Task;
  users: UserOption[];
  role: Role;
  canDelete: boolean;
};

const WORKFLOW: TaskStatus[] = ["I_RI", "NE_PROCES", "PERFUNDUAR"];

function eventLabel(type: string) {
  switch (type) {
    case "CREATED":
      return "Krijim";
    case "ASSIGNED":
      return "Delegim";
    case "UNASSIGNED":
      return "Heqje delegimi";
    case "STATUS_CHANGED":
      return "Ndryshim statusi";
    case "COMMENT_ADDED":
      return "Koment";
    case "DOCUMENT_UPLOADED":
      return "Dokument";
    default:
      return "Përditësim";
  }
}

export function TaskDetail({ task, users, role, canDelete }: Props) {
  const router = useRouter();
  const initialUnit = task.orgUnit || "";
  const [status, setStatus] = useState(task.status);
  const [orgUnit, setOrgUnit] = useState(initialUnit);
  const [comment, setComment] = useState("");
  const [docs, setDocs] = useState(task.documents);
  const [comments, setComments] = useState(task.comments);
  const [history, setHistory] = useState(task.history || []);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [flashHistory, setFlashHistory] = useState(false);
  const [committedStatus, setCommittedStatus] = useState(task.status);
  const [redelegating, setRedelegating] = useState(false);
  const [redelegateTo, setRedelegateTo] = useState("");
  const [redelegateNote, setRedelegateNote] = useState("");

  const unitMembers = useMemo(() => {
    if (!orgUnit) return [];
    return users.filter((u) => u.orgUnit === orgUnit);
  }, [users, orgUnit]);

  const lastStatusChange = useMemo(
    () =>
      [...history].reverse().find((h) => h.type === "STATUS_CHANGED") || null,
    [history],
  );

  const workflowIndex = status === "BLOKUAR" ? -1 : WORKFLOW.indexOf(status);

  async function refreshHistory() {
    const res = await fetch(`/api/tasks/${task.id}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.history) setHistory(data.history);
    if (data.documents) setDocs(data.documents);
    if (data.comments) setComments(data.comments);
    if (data.status) setStatus(data.status as TaskStatus);
  }

  async function saveMeta() {
    setBusy(true);
    setMsg("");
    const statusBefore = committedStatus;
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Nuk u ruajt.");
      return;
    }
    const saved = await res.json().catch(() => null);
    const nextStatus = (saved?.status as TaskStatus) || status;
    setCommittedStatus(nextStatus);
    await refreshHistory();
    if (nextStatus !== statusBefore) {
      setMsg(
        `Statusi u ndryshua në «${STATUS_LABELS[nextStatus]}» — shiko workflow më poshtë.`,
      );
      setFlashHistory(true);
      setTimeout(() => setFlashHistory(false), 2500);
      document.getElementById("workflow-history")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    } else {
      setMsg("U ruajt.");
    }
    router.refresh();
  }

  async function confirmRedelegate() {
    if (!canRedelegate(role) || !redelegateTo) return;
    setBusy(true);
    setMsg("");
    const note = redelegateNote.trim();
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgUnit: redelegateTo,
        ...(canAssignTask(role) ? { assigneeId: null } : {}),
        ...(note ? { comment: note } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Ri-delegimi dështoi.");
      return;
    }
    const saved = await res.json().catch(() => null);
    if (saved && saved.stillHasAccess === false) {
      router.push("/panel?ridelegim=ok");
      router.refresh();
      return;
    }
    setOrgUnit(redelegateTo);
    setRedelegating(false);
    setRedelegateTo("");
    setRedelegateNote("");
    setMsg(`U ri-delegua te ${shortOrgUnit(redelegateTo)}.`);
    await refreshHistory();
    router.refresh();
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tasks/${task.id}/documents`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    e.target.value = "";
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Ngarkimi dështoi");
      return;
    }
    const doc = await res.json();
    setDocs((d) => [
      {
        id: doc.id,
        originalName: doc.originalName,
        size: doc.size,
        createdAt: doc.createdAt,
        uploadedBy: { name: "Ju" },
      },
      ...d,
    ]);
    setMsg("Dokumenti u ngarkua.");
    await refreshHistory();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Komenti nuk u shtua.");
      return;
    }
    const c = await res.json();
    setComments((prev) => [...prev, c]);
    setComment("");
    await refreshHistory();
  }

  async function removeTask() {
    if (!confirm("Fshi këtë detyrë?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/panel");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4 pb-28 sm:space-y-6 sm:pb-0">
      <div className="surface-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-brand to-brand-dark px-4 py-3.5 text-white sm:gap-3 sm:px-5 sm:py-4 md:px-8">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] opacity-80">
              Numri i çështjes
            </p>
            <p className="mt-0.5 truncate font-mono text-lg font-extrabold tracking-tight sm:text-xl md:text-2xl">
              {task.number || "—"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
                  {task.title}
                </h1>
                {task.isCitizenRequest && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-white">
                    Qytetar
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted">
                Krijuar {format(new Date(task.createdAt), "dd.MM.yyyy HH:mm")}
                {task.creator ? ` · nga ${task.creator.name}` : ""}
              </p>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={removeTask}
                className="shrink-0 text-sm font-medium text-brand underline underline-offset-2"
              >
                Fshi
              </button>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-line bg-bg/60 p-3 sm:mt-6 sm:p-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Workflow i çështjes
            </p>
            {status === "BLOKUAR" ? (
              <p className="mt-3 text-sm font-semibold text-zinc-600">
                Çështja është e bllokuar
                {lastStatusChange
                  ? ` · nga ${lastStatusChange.actorName}`
                  : ""}
              </p>
            ) : (
              <ol className="mt-3 flex items-start gap-0 sm:mt-4 sm:items-center">
                {WORKFLOW.map((step, i) => {
                  const done = workflowIndex > i;
                  const current = workflowIndex === i;
                  return (
                    <li key={step} className="flex min-w-0 flex-1 items-center">
                      <div className="flex w-full flex-col items-center gap-1 text-center sm:gap-1.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-bold transition sm:h-8 sm:w-8 sm:text-xs ${
                            done
                              ? "bg-emerald-600 text-white"
                              : current
                                ? "bg-brand text-white ring-4 ring-brand/20"
                                : "bg-zinc-200 text-zinc-500"
                          }`}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span
                          className={`max-w-full px-0.5 text-[0.6rem] font-semibold leading-tight sm:text-[0.7rem] ${
                            current ? "text-brand" : "text-muted"
                          }`}
                        >
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                      {i < WORKFLOW.length - 1 && (
                        <div
                          className={`mx-0.5 mt-3.5 h-0.5 min-w-[0.5rem] flex-1 rounded sm:mx-1 sm:mt-0 ${
                            workflowIndex > i ? "bg-emerald-500" : "bg-zinc-200"
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {lastStatusChange && (
              <p className="mt-3 break-words border-t border-line pt-3 text-xs text-muted sm:mt-4">
                Ndryshimi i fundit:{" "}
                <span className="font-semibold text-ink">
                  {lastStatusChange.message}
                </span>
                {" · "}
                {format(
                  new Date(lastStatusChange.createdAt),
                  "dd.MM.yyyy HH:mm",
                )}
              </p>
            )}
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed text-ink/85 sm:mt-6">
            {task.description}
          </p>

          {(task.citizenName ||
            task.citizenPhone ||
            task.citizenEmail ||
            task.requestDate) && (
            <dl className="mt-5 grid gap-3 rounded-xl bg-brand-soft/40 p-3 text-sm sm:mt-6 sm:grid-cols-2 sm:p-4">
              {task.citizenName && (
                <div>
                  <dt className="font-semibold text-brand">Qytetari</dt>
                  <dd className="break-words">{task.citizenName}</dd>
                </div>
              )}
              {task.citizenPhone && (
                <div>
                  <dt className="font-semibold text-brand">Telefoni</dt>
                  <dd>
                    <a
                      href={`tel:${task.citizenPhone}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {task.citizenPhone}
                    </a>
                  </dd>
                </div>
              )}
              {task.citizenEmail && (
                <div>
                  <dt className="font-semibold text-brand">Email</dt>
                  <dd className="break-all">
                    <a
                      href={`mailto:${task.citizenEmail}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {task.citizenEmail}
                    </a>
                  </dd>
                </div>
              )}
              {task.requestDate && (
                <div>
                  <dt className="font-semibold text-brand">Data e kërkesës</dt>
                  <dd>{format(new Date(task.requestDate), "dd.MM.yyyy")}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-5 space-y-4 sm:mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="status">
                  Statusi
                </label>
                <select
                  id="status"
                  className="field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="label">Drejtoria / Agjencia</p>
                <p
                  className="field break-words bg-bg text-sm font-medium leading-snug text-ink"
                  title={orgUnit || undefined}
                >
                  {orgUnit || "— pa delegim —"}
                </p>
              </div>
            </div>

            {orgUnit && (
              <div className="rounded-xl border border-line bg-bg/50 p-3 sm:p-4">
                <p className="label !mb-2">
                  Personat e kësaj drejtorie ({unitMembers.length})
                </p>
                {unitMembers.length === 0 ? (
                  <p className="text-sm text-muted">
                    Nuk ka përdorues të lidhur me këtë drejtori ende. Shtoni
                    përdorues te «Përdoruesit» me këtë njësi.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {unitMembers.map((u) => (
                      <li
                        key={u.id}
                        className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium"
                      >
                        {u.name}
                        {u.role ? (
                          <span className="ml-1 text-muted">
                            · {ROLE_LABELS[u.role]}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted">
                  Të gjithë këta kanë akses automatik te kjo çështje.
                </p>
              </div>
            )}

            {canRedelegate(role) && (
              <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-3 sm:p-4">
                {!redelegating ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <p className="text-sm text-muted">
                      Drejtoria është e fiksuar. Për ta ndryshuar, ri-delegoni.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRedelegating(true);
                        setRedelegateTo("");
                      }}
                      className="btn-ghost !py-2 text-sm w-full sm:w-auto"
                    >
                      Ri-delego
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="label" htmlFor="redelegate">
                      Zgjidhni drejtorinë / agjencinë e re
                    </label>
                    <select
                      id="redelegate"
                      className="field"
                      value={redelegateTo}
                      onChange={(e) => setRedelegateTo(e.target.value)}
                    >
                      <option value="">— zgjidhni —</option>
                      {ORG_UNITS.map((o) => (
                        <option key={o} value={o} disabled={o === orgUnit}>
                          {o}
                          {o === orgUnit ? " (aktuale)" : ""}
                        </option>
                      ))}
                    </select>
                    <div>
                      <label className="label" htmlFor="redelegate-note">
                        Koment për ri-delegimin (opsional)
                      </label>
                      <textarea
                        id="redelegate-note"
                        className="field resize-y"
                        rows={3}
                        maxLength={5000}
                        value={redelegateNote}
                        onChange={(e) => setRedelegateNote(e.target.value)}
                        placeholder="P.sh. arsyeja e ri-delegimit, udhëzime për drejtorinë e re..."
                      />
                    </div>
                    {!canAssignTask(role) && (
                      <p className="text-xs text-muted">
                        Pas ri-delegimit, detyra kalon te drejtoria e re dhe nuk do të
                        jetë më në listën tuaj.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        disabled={busy || !redelegateTo}
                        onClick={confirmRedelegate}
                        className="btn-primary !py-2 text-sm disabled:opacity-60 sm:w-auto"
                      >
                        Konfirmo ri-delegimin
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRedelegating(false);
                          setRedelegateTo("");
                          setRedelegateNote("");
                        }}
                        className="btn-ghost !py-2 text-sm sm:w-auto"
                      >
                        Anulo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 hidden flex-wrap items-center gap-3 sm:flex">
            <button
              type="button"
              onClick={saveMeta}
              disabled={busy}
              className="btn-primary disabled:opacity-60"
            >
              Ruaj ndryshimet
            </button>
            {msg && <p className="text-sm text-muted">{msg}</p>}
          </div>
        </div>
      </div>

      {/* Sticky save on mobile */}
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-3 py-2.5 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={saveMeta}
            disabled={busy}
            className="btn-primary flex-1 !py-2.5 disabled:opacity-60"
          >
            {busy ? "Duke ruajtur..." : "Ruaj ndryshimet"}
          </button>
        </div>
        {msg && (
          <p className="mx-auto mt-1.5 max-w-lg text-center text-xs text-muted">
            {msg}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Dokumente</h2>
          <p className="mt-1 text-sm text-muted">
            PDF, Word, Excel, foto — max 15MB
          </p>
          <label className="btn-ghost mt-4 inline-flex cursor-pointer !py-2 text-sm">
            Ngarko dokument
            <input
              type="file"
              className="hidden"
              onChange={uploadFile}
              accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
            />
          </label>
          <ul className="mt-4 space-y-2">
            {docs.length === 0 && (
              <li className="text-sm text-muted">Nuk ka dokumente.</li>
            )}
            {docs.map((d) => (
              <li key={d.id}>
                <a
                  href={`/api/tasks/${task.id}/documents/${d.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand/40 hover:bg-brand-soft/30"
                >
                  <span className="truncate font-medium">{d.originalName}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {(d.size / 1024).toFixed(0)} KB
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Komente</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {comments.length === 0 && (
              <li className="text-sm text-muted">Nuk ka komente ende.</li>
            )}
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-bg px-3 py-2">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-ink">{c.author.name}</span>
                  {" · "}
                  {ROLE_LABELS[c.author.role]}
                  {" · "}
                  {format(new Date(c.createdAt), "dd.MM.yyyy HH:mm")}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={addComment} className="mt-4 space-y-2">
            <textarea
              className="field resize-y"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Shkruani një koment..."
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary !py-2 text-sm"
            >
              Shto koment
            </button>
          </form>
        </section>
      </div>

      <section
        id="workflow-history"
        className={`surface-card p-6 md:p-8 transition ${
          flashHistory ? "ring-2 ring-brand/40" : ""
        }`}
      >
        <h2 className="text-lg font-bold">Historiku i workflow-it</h2>
        <p className="mt-1 text-sm text-muted">
          Kush e krijoi, kush e delegoi, kush ndryshoi statusin — hapa me radhë.
        </p>
        <ol className="relative mt-6 space-y-0 border-l-2 border-brand/25 pl-6">
          {history.length === 0 && (
            <li className="text-sm text-muted">Nuk ka historik ende.</li>
          )}
          {history.map((h, i) => {
            const isLatest = i === history.length - 1;
            const isStatus = h.type === "STATUS_CHANGED";
            return (
              <li key={h.id} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -left-[1.91rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow ${
                    h.type === "CREATED"
                      ? "bg-ink"
                      : h.type === "ASSIGNED" || h.type === "UNASSIGNED"
                        ? "bg-brand"
                        : isStatus
                          ? "bg-amber-500"
                          : h.type === "DOCUMENT_UPLOADED"
                            ? "bg-emerald-600"
                            : "bg-brand/70"
                  }`}
                />
                <div
                  className={`rounded-xl border px-4 py-3 transition ${
                    isLatest || (flashHistory && isStatus)
                      ? "border-brand/35 bg-brand-soft/40"
                      : "border-line bg-bg/50 hover:border-brand/25 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-brand">
                      {eventLabel(h.type)}
                      {isLatest && (
                        <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[0.55rem] text-white">
                          TANI
                        </span>
                      )}
                    </span>
                    <time className="text-xs text-muted">
                      {format(new Date(h.createdAt), "dd.MM.yyyy HH:mm")}
                    </time>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink">{h.message}</p>
                  <p className="mt-1 text-xs text-muted">
                    nga{" "}
                    <span className="font-semibold text-ink">{h.actorName}</span>
                    {h.actorRole ? ` · ${ROLE_LABELS[h.actorRole]}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Download, FileText, Loader2, Lock, Mail, Pencil, Printer, Send } from "lucide-react";
import { MessageNotice, Notice, type NoticeMessage } from "@/components/Notice";
import { STATUS_LABELS, shortOrgUnit } from "@/lib/constants";
import type { ResponseView, TaskStatus } from "@/lib/types";

const smallBtn = "btn-ghost !min-h-0 !px-3 !py-1.5 text-xs disabled:opacity-50";

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function printPdf(url: string) {
  const inlineUrl = `${url}?inline=1`;
  if (isMobile()) {
    window.open(inlineUrl, "_blank", "noopener");
    return;
  }
  const res = await fetch(inlineUrl);
  if (!res.ok) throw new Error("PDF");
  const blobUrl = URL.createObjectURL(await res.blob());
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = blobUrl;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(blobUrl, "_blank");
    }
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(blobUrl);
    }, 60_000);
  };
  document.body.appendChild(frame);
}

function PdfActions({
  pdfUrl,
  emailUrl,
  emailTo,
  confirmNote,
  onSent,
}: {
  pdfUrl: string;
  emailUrl: string;
  emailTo: string | null;
  confirmNote?: string;
  onSent?: (json: { response?: ResponseView }) => void;
}) {
  const [busy, setBusy] = useState<"print" | "mail" | null>(null);
  const [note, setNote] = useState<NoticeMessage | null>(null);

  async function print() {
    setBusy("print");
    setNote(null);
    try {
      await printPdf(pdfUrl);
    } catch {
      setNote({ ok: false, text: "PDF nuk u hap për printim." });
    } finally {
      setBusy(null);
    }
  }

  async function mail() {
    const question = `Dërgo PDF-në me email te ${emailTo}?${confirmNote ? `\n\n${confirmNote}` : ""}`;
    if (!emailTo || !confirm(question)) return;
    setBusy("mail");
    setNote(null);
    const res = await fetch(emailUrl, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setNote({ ok: false, text: json.error || "Emaili nuk u dërgua." });
      return;
    }
    setNote({ ok: true, text: `U dërgua te ${emailTo}.` });
    onSent?.(json);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={print} disabled={busy !== null} className={smallBtn}>
          {busy === "print" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Printo
        </button>
        <a href={pdfUrl} download className={smallBtn}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Shkarko PDF
        </a>
        <button
          type="button"
          onClick={mail}
          disabled={busy !== null || !emailTo}
          title={emailTo ? `Dërgo te ${emailTo}` : "Kërkuesi nuk ka dhënë email"}
          className={smallBtn}
        >
          {busy === "mail" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Dërgo me email
        </button>
      </div>
      <MessageNotice msg={note} size="sm" onClose={() => setNote(null)} className="mt-2" />
      {!emailTo && (
        <p className="mt-2 text-xs text-muted">Kërkuesi nuk ka dhënë email — mund ta printoni ose shkarkoni.</p>
      )}
    </div>
  );
}

export function RequestSheet({
  taskId,
  number,
  citizenEmail,
  onChanged,
}: {
  taskId: string;
  number: string;
  citizenEmail: string | null;
  onChanged?: () => void;
}) {
  return (
    <section className="surface-card flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-bold">Fleta e kërkesës</h2>
          <p className="text-sm text-muted">
            PDF zyrtare me logon e Ministrisë dhe numrin <span className="font-mono font-semibold text-ink">{number}</span>
          </p>
        </div>
      </div>
      <PdfActions
        pdfUrl={`/api/tasks/${taskId}/pdf`}
        emailUrl={`/api/tasks/${taskId}/pdf/email`}
        emailTo={citizenEmail}
        onSent={() => onChanged?.()}
      />
    </section>
  );
}

type SaveResult = { response: ResponseView; status: TaskStatus };

function statusNote(before: TaskStatus, after: TaskStatus) {
  return before === after ? "" : ` Kërkesa kaloi në «${STATUS_LABELS[after]}».`;
}

/** Forma e përbashkët për përgjigje të re dhe për ndryshimin e një drafti. */
function ResponseEditor({
  idPrefix,
  initialContent = "",
  initialFinal = false,
  submitLabel,
  confirmText,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initialContent?: string;
  initialFinal?: boolean;
  submitLabel: string;
  confirmText?: (isFinal: boolean) => string;
  onSubmit: (input: { content: string; isFinal: boolean }) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [isFinal, setIsFinal] = useState(initialFinal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (text.length < 10) {
      setError("Përgjigjja duhet të ketë të paktën 10 karaktere.");
      return;
    }
    if (confirmText && !confirm(confirmText(isFinal))) return;
    setBusy(true);
    setError("");
    const err = await onSubmit({ content: text, isFinal });
    setBusy(false);
    if (err) setError(err);
    else if (!onCancel) {
      setContent("");
      setIsFinal(false);
    }
  }

  const option = (value: boolean, title: string, hint: string) => (
    <label
      className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition ${
        isFinal === value ? "border-brand bg-white shadow-sm" : "border-line bg-white/60"
      }`}
    >
      <input
        type="radio"
        name={`${idPrefix}-kind`}
        className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
        checked={isFinal === value}
        onChange={() => setIsFinal(value)}
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        id={`${idPrefix}-content`}
        aria-label="Zgjidhja / përgjigjja"
        className="field resize-y"
        rows={7}
        maxLength={20000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Shkruani zgjidhjen ose përgjigjen zyrtare për kërkuesin..."
      />
      <fieldset className="flex flex-col gap-2 sm:flex-row">
        <legend className="sr-only">Lloji i përgjigjes</legend>
        {option(false, "Përgjigje e pjesshme", "Kërkesa mbetet «Në proces»")}
        {option(true, "Përgjigje përfundimtare", "Kërkesa kalon «Përfunduar»")}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary !py-2 text-sm disabled:opacity-60">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost !py-2 text-sm">
            Anulo
          </button>
        )}
        <span className="text-xs text-muted">{content.trim().length} karaktere</span>
      </div>
      {error && (
        <Notice tone="error" onClose={() => setError("")}>
          {error}
        </Notice>
      )}
    </form>
  );
}

function ResponseItem({
  taskId,
  response,
  status,
  citizenEmail,
  canEdit,
  onSaved,
  onSent,
}: {
  taskId: string;
  response: ResponseView;
  status: TaskStatus;
  citizenEmail: string | null;
  canEdit: boolean;
  onSaved: (result: SaveResult, message: string) => void;
  onSent: (response: ResponseView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const long = response.content.length > 360 || response.content.split("\n").length > 5;
  const edited = response.updatedAt !== response.createdAt;

  async function save(input: { content: string; isFinal: boolean }) {
    const res = await fetch(`/api/tasks/${taskId}/responses/${response.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error || "Ndryshimi nuk u ruajt.";
    setEditing(false);
    const result = json as SaveResult;
    onSaved(result, `Përgjigjja ${response.number} u ndryshua.${statusNote(status, result.status)}`);
    return null;
  }

  return (
    <li className="rounded-xl border border-line bg-bg/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-ink px-2 py-0.5 font-mono text-xs font-bold text-white">
            Nr. {response.number}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
              response.isFinal ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {response.isFinal ? "Përfundimtare" : "E pjesshme"}
          </span>
          {response.sentAt ? (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"
              title={`Dërguar te ${response.sentTo ?? "kërkuesi"}`}
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Dërguar {format(new Date(response.sentAt), "dd.MM.yyyy HH:mm")}
            </span>
          ) : (
            <span className="rounded-md bg-line/60 px-2 py-0.5 text-xs font-semibold text-muted">
              Pa dërguar · mund të ndryshohet
            </span>
          )}
        </div>
        <time className="text-xs text-muted">
          {format(new Date(response.createdAt), "dd.MM.yyyy HH:mm")}
          {edited && ` · ndryshuar ${format(new Date(response.updatedAt), "dd.MM.yyyy HH:mm")}`}
        </time>
      </div>
      <p className="mt-2 text-xs text-muted">
        <span className="font-semibold text-ink">{response.authorName}</span>
        {" · "}
        {shortOrgUnit(response.orgUnit)}
      </p>

      {editing ? (
        <div className="mt-3">
          <ResponseEditor
            idPrefix={`edit-${response.id}`}
            initialContent={response.content}
            initialFinal={response.isFinal}
            submitLabel="Ruaj ndryshimet"
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <p
            className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${open || !long ? "" : "line-clamp-4"}`}
          >
            {response.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 text-xs font-semibold text-brand underline-offset-2 hover:underline"
            >
              {open ? "Shfaq më pak" : "Shfaq të plotë"}
            </button>
          )}
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-start sm:justify-between">
            <PdfActions
              pdfUrl={`/api/tasks/${taskId}/responses/${response.id}/pdf`}
              emailUrl={`/api/tasks/${taskId}/responses/${response.id}/email`}
              emailTo={citizenEmail}
              confirmNote={
                response.sentAt ? undefined : "Pas dërgimit, përgjigjja kyçet dhe nuk mund të ndryshohet më."
              }
              onSent={(json) => json.response && onSent(json.response)}
            />
            {canEdit && !response.sentAt && (
              <button type="button" onClick={() => setEditing(true)} className={smallBtn}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Ndrysho
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

export function ResponsesSection({
  taskId,
  number,
  status,
  orgUnit,
  citizenEmail,
  canRespond,
  initial,
  onChanged,
}: {
  taskId: string;
  number: string;
  status: TaskStatus;
  orgUnit: string | null;
  citizenEmail: string | null;
  canRespond: boolean;
  initial: ResponseView[];
  onChanged?: () => void;
}) {
  const [responses, setResponses] = useState(initial);
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const nextNumber = `${number}-${responses.reduce((m, r) => Math.max(m, r.seq), 0) + 1}`;
  const closed = status === "PERFUNDUAR";
  const finalResponse = [...responses].reverse().find((r) => r.isFinal);

  function replace(updated: ResponseView) {
    setResponses((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function create(input: { content: string; isFinal: boolean }) {
    const res = await fetch(`/api/tasks/${taskId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error || "Përgjigjja nuk u ruajt.";
    const result = json as SaveResult;
    setResponses((prev) => [...prev, result.response]);
    setMsg({
      ok: true,
      text: `Përgjigjja ${result.response.number} u lëshua.${statusNote(status, result.status)} Mund ta ndryshoni derisa ta dërgoni me email.`,
    });
    onChanged?.();
    return null;
  }

  return (
    <section className="surface-card p-4 sm:p-6 md:p-8">
      <h2 className="text-lg font-bold">Përgjigjet e drejtorisë</h2>
      <p className="mt-1 text-sm text-muted">
        Çdo përgjigje lëshohet si shkresë zyrtare me numrin e çështjes dhe rendin e saj (-1, -2, …). Mund të
        ndryshohet derisa t&apos;i dërgohet kërkuesit me email.
      </p>

      <ul className="mt-5 space-y-3">
        {responses.length === 0 && (
          <li className="text-sm text-muted">Nuk është lëshuar ende asnjë përgjigje.</li>
        )}
        {responses.map((r) => (
          <ResponseItem
            key={r.id}
            taskId={taskId}
            response={r}
            status={status}
            citizenEmail={citizenEmail}
            canEdit={canRespond && (!closed || r.isFinal)}
            onSaved={(result, text) => {
              replace(result.response);
              setMsg({ ok: true, text });
              onChanged?.();
            }}
            onSent={(updated) => {
              replace(updated);
              onChanged?.();
            }}
          />
        ))}
      </ul>

      <MessageNotice msg={msg} onClose={() => setMsg(null)} className="mt-4" />

      {closed ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="font-bold text-emerald-900">
              {finalResponse
                ? `Kërkesa u mbyll me përgjigjen përfundimtare Nr. ${finalResponse.number}`
                : "Kërkesa është e mbyllur (Përfunduar)"}
            </p>
            <p className="mt-0.5 text-emerald-900/75">
              Nuk shtohen më zgjidhje të tjera. Nëse duhet një përgjigje e re, rihapeni kërkesën duke e kaluar statusin
              në «Në proces».
            </p>
          </div>
        </div>
      ) : canRespond && orgUnit ? (
        <div className="mt-6 space-y-3 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label className="label !mb-0" htmlFor="new-response-content">
              Zgjidhja / përgjigjja
            </label>
            <span className="text-xs text-muted">
              Do të lëshohet si <span className="font-mono font-semibold text-ink">Nr. {nextNumber}</span> nga{" "}
              {shortOrgUnit(orgUnit)}
            </span>
          </div>
          <ResponseEditor
            idPrefix="new-response"
            submitLabel="Lësho përgjigjen"
            confirmText={(isFinal) =>
              `Përgjigjja ${isFinal ? "përfundimtare" : "e pjesshme"} do të lëshohet me Nr. ${nextNumber}` +
              (isFinal ? " dhe kërkesa do të kalojë «Përfunduar»." : ".") +
              "\n\nMund ta ndryshoni derisa ta dërgoni me email te kërkuesi. Vazhdo?"
            }
            onSubmit={create}
          />
        </div>
      ) : (
        <Notice tone="info" className="mt-5">
          {orgUnit
            ? "Nuk keni të drejtë të lëshoni përgjigje për këtë kërkesë."
            : "Kërkesa duhet të delegohet te një drejtori që të lëshohet përgjigje."}
        </Notice>
      )}
    </section>
  );
}

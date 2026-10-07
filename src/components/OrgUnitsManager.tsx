"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { MessageNotice, Notice, type NoticeMessage } from "@/components/Notice";
import type { OrgUnitUsage, OrgUnitView } from "@/lib/types";

const smallBtn = "btn-ghost !min-h-0 !px-2.5 !py-1.5 text-xs disabled:opacity-50";
const EMPTY: OrgUnitUsage = { users: 0, tasks: 0, openTasks: 0 };

async function send(url: string, method: "POST" | "PATCH", body: object) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const json = await res?.json().catch(() => ({}));
  return res?.ok
    ? { ok: true as const, unit: json as OrgUnitView }
    : { ok: false as const, error: (json?.error as string) || "Ndodhi një gabim. Provoni sërish." };
}

function UnitRow({
  unit,
  usage,
  onChange,
}: {
  unit: OrgUnitView;
  usage: OrgUnitUsage;
  onChange: (u: OrgUnitView, oldName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage | null>(null);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === unit.name) {
      setEditing(false);
      return;
    }
    if (
      (usage.users > 0 || usage.tasks > 0) &&
      !confirm(
        `Emri i ri do të vendoset edhe te ${usage.users} përdorues dhe ${usage.tasks} detyra të kësaj drejtorie. Vazhdo?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await send(`/api/org-units/${unit.id}`, "PATCH", { name });
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    setEditing(false);
    onChange(r.unit, unit.name);
    setMsg({ ok: true, text: "Emri u ndryshua." });
  }

  async function toggle() {
    const next = !unit.active;
    let question = next
      ? `Riaktivizo „${unit.name}"? Do të shfaqet sërish në formular dhe në delegim.`
      : `Çaktivizo „${unit.name}"?\n\nNuk do të shfaqet më në formularin e qytetarit dhe në delegimin e ri. Detyrat ekzistuese dhe raportet nuk preken.`;
    if (!next && (usage.users > 0 || usage.openTasks > 0)) {
      question += `\n\nKujdes: ka ${usage.users} përdorues aktivë dhe ${usage.openTasks} detyra të hapura. Ata vazhdojnë t'i shohin detyrat e tyre; ridelegojini ose caktojuni drejtori tjetër nëse duhet.`;
    }
    if (!confirm(question)) return;
    setBusy(true);
    setMsg(null);
    const r = await send(`/api/org-units/${unit.id}`, "PATCH", { active: next });
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    onChange(r.unit, unit.name);
  }

  return (
    <li className={`px-4 py-3.5 sm:px-6 ${unit.active ? "" : "bg-zinc-50"}`}>
      {editing ? (
        <form onSubmit={rename} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`unit-${unit.id}`}>
            Emri i drejtorisë
          </label>
          <input
            id={`unit-${unit.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={150}
            autoFocus
            className="field flex-1"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary !py-2 text-sm disabled:opacity-60">
              {busy ? "Duke ruajtur..." : "Ruaj"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setName(unit.name);
                setEditing(false);
              }}
              className="btn-ghost !py-2 text-sm"
            >
              Anulo
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className={`min-w-0 flex-1 ${unit.active ? "" : "opacity-60"}`}>
            <p className="font-semibold">{unit.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {usage.users} përdorues · {usage.openTasks} detyra të hapura · {usage.tasks} gjithsej
            </p>
            {!unit.active && (
              <span className="mt-1.5 inline-block rounded-md bg-zinc-200 px-2 py-0.5 text-[0.7rem] font-semibold text-zinc-700">
                E çaktivizuar
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setName(unit.name);
                setEditing(true);
                setMsg(null);
              }}
              className={smallBtn}
            >
              <Pencil className="h-3.5 w-3.5" />
              Riemërto
            </button>
            <button type="button" onClick={toggle} disabled={busy} className={smallBtn}>
              {unit.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {unit.active ? "Çaktivizo" : "Riaktivizo"}
            </button>
          </div>
        </div>
      )}
      <MessageNotice msg={msg} size="sm" onClose={() => setMsg(null)} className="mt-2" />
    </li>
  );
}

export function OrgUnitsManager({
  initialUnits,
  usage: initialUsage,
}: {
  initialUnits: OrgUnitView[];
  usage: Record<string, OrgUnitUsage>;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [usage, setUsage] = useState(initialUsage);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeCount = units.filter((u) => u.active).length;

  const sorted = (list: OrgUnitView[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, "sq"));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await send("/api/org-units", "POST", { name });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setUnits((list) => sorted([...list, r.unit]));
    setName("");
    router.refresh();
  }

  function replace(u: OrgUnitView, oldName: string) {
    setUnits((list) => sorted(list.map((x) => (x.id === u.id ? u : x))));
    if (u.name !== oldName) {
      setUsage((m) => {
        const { [oldName]: moved = EMPTY, ...rest } = m;
        return { ...rest, [u.name]: moved };
      });
    }
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4 lg:self-start">
        <form onSubmit={add} className="surface-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-bold">Shto drejtori / agjenci</h2>
          <div>
            <label className="label" htmlFor="new-unit">
              Emri i plotë
            </label>
            <input
              id="new-unit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={150}
              placeholder="p.sh. Drejtoria e Përgjithshme e …"
              className="field"
            />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {busy ? "Duke shtuar..." : "Shto"}
          </button>
        </form>
        <Notice tone="info">
          <strong>Riemërtimi</strong> përditëson automatikisht përdoruesit dhe detyrat e asaj drejtorie.{" "}
          <strong>Çaktivizimi</strong> e heq nga formulari dhe delegimi i ri, por ruan historikun dhe
          raportet. Drejtoritë nuk fshihen, që të mos humbasin të dhënat.
        </Notice>
      </div>

      <div className="surface-card overflow-hidden lg:self-start">
        <div className="flex items-center gap-2 border-b border-line px-4 py-4 sm:px-6">
          <Building2 className="h-5 w-5 text-brand" aria-hidden="true" />
          <h2 className="text-lg font-bold">
            Drejtoritë ({activeCount} aktive{units.length > activeCount ? `, ${units.length - activeCount} joaktive` : ""})
          </h2>
        </div>
        <ul className="divide-y divide-line">
          {units.map((u) => (
            <UnitRow key={u.id} unit={u} usage={usage[u.name] ?? EMPTY} onChange={replace} />
          ))}
        </ul>
      </div>
    </div>
  );
}

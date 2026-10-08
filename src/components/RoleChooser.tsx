"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { RoleIcon, ROLE_STYLES } from "@/components/RoleIcon";
import { ROLE_LABELS, ROLE_SUMMARIES, isManagerRole } from "@/lib/constants";
import type { Role } from "@/lib/types";

export type ChoosableRole = { key: string; role: Role; orgUnit: string | null };

async function switchRole(key: string) {
  const res = await fetch("/api/session/role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  }).catch(() => null);
  if (res?.ok) return null;
  const json = await res?.json().catch(() => ({}));
  return (json as { error?: string })?.error || "Roli nuk u ndërrua. Provoni sërish.";
}

function scopeOf(option: ChoosableRole) {
  if (isManagerRole(option.role)) return "Të gjitha drejtoritë";
  if (option.orgUnit) return option.orgUnit;
  return option.role === "MONITORUES" ? "Gjithë sistemi" : "Pa drejtori";
}

export function RoleChooser({
  options,
  currentKey,
  next,
}: {
  options: ChoosableRole[];
  currentKey: string | null;
  next: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function choose(key: string) {
    setBusy(key);
    setError("");
    const err = await switchRole(key);
    if (err) {
      setError(err);
      setBusy(null);
      return;
    }
    window.location.assign(next);
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const current = o.key === currentKey;
          const scope = scopeOf(o);
          return (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => choose(o.key)}
                disabled={!!busy}
                className={`group flex h-full w-full flex-col items-start gap-3 rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70 ${
                  current ? "border-brand" : `border-line ${ROLE_STYLES[o.role].ring}`
                }`}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <RoleIcon role={o.role} className="h-14 w-14" />
                  {busy === o.key ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden="true" />
                  ) : current ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-bold text-white">
                      <Check className="h-3 w-3" aria-hidden="true" /> Aktiv
                    </span>
                  ) : null}
                </span>
                <span>
                  <span className="block text-lg font-extrabold text-ink">{ROLE_LABELS[o.role]}</span>
                  {scope && <span className="mt-0.5 block text-sm font-semibold text-brand">{scope}</span>}
                  <span className="mt-1.5 block text-sm text-muted">{ROLE_SUMMARIES[o.role]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

/** Kur një lidhje (p.sh. nga njoftimi) i përket një roli tjetër të përdoruesit, kalon vetë. */
export function RoleAutoSwitch({ option }: { option: ChoosableRole }) {
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    switchRole(option.key).then((err) => {
      if (err) setError(err);
      else window.location.reload();
    });
  }, [option.key]);

  return (
    <div className="surface-card mx-auto mt-10 max-w-md p-6 text-center">
      <RoleIcon role={option.role} className="mx-auto h-14 w-14" />
      <p className="mt-4 font-semibold">
        Kjo kërkesë i përket rolit tuaj «{ROLE_LABELS[option.role]}
        {option.orgUnit ? ` · ${option.orgUnit}` : ""}».
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : (
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Po kaloni te ky rol...
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, Mail, Pencil, Plus, Search, UserCheck, UserX, X } from "lucide-react";
import { MessageNotice, Notice, type NoticeMessage } from "@/components/Notice";
import { ROLE_LABELS, shortOrgUnit } from "@/lib/constants";
import type { ExtraRole, Role, UserView } from "@/lib/types";
import { roleOptions } from "@/lib/user-roles";

type UnitOption = { name: string; active: boolean };

const ROLES: Role[] = ["PERFAQESUES", "RECEPSION", "ADMINISTRATOR", "ADMIN", "MONITORUES"];

const ROLE_HINTS: Record<Role, string> = {
  PERFAQESUES: "Trajton kërkesat e deleguara te drejtoria e vet.",
  RECEPSION: "Regjistron dhe delegon kërkesat; sheh gjithçka dhe raportet.",
  ADMINISTRATOR:
    "Si Recepsioni: regjistron, delegon, sheh gjithçka dhe raportet. Nuk menaxhon përdoruesit dhe drejtoritë.",
  ADMIN: "Gjithçka, përfshirë përdoruesit, drejtoritë dhe fshirjen e kërkesave.",
  MONITORUES:
    "Vetëm shikim, pa ndryshuar asgjë. Pa drejtori: gjithë sistemi + raportet. Me drejtori: vetëm kërkesat e saj.",
};
const NO_UNIT = "__none__";

/** Kërkim pa dallim shkronjash/diakritikësh: «Ë» → «e», «ç» → «c». */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const smallBtn = "btn-ghost !min-h-0 !px-2.5 !py-1.5 text-xs disabled:opacity-50";

async function send(url: string, method: "POST" | "PATCH", body: object) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const json = await res?.json().catch(() => ({}));
  return res?.ok
    ? { ok: true as const, json }
    : { ok: false as const, error: (json?.error as string) || "Ndodhi një gabim. Provoni sërish." };
}

function UnitSelect({
  id,
  units,
  value,
  onChange,
  name,
  defaultValue,
}: {
  id: string;
  units: UnitOption[];
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  defaultValue?: string;
}) {
  const current = value ?? defaultValue ?? "";
  return (
    <select
      id={id}
      name={name}
      className="field"
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      <option value="">— pa drejtori —</option>
      {units
        .filter((u) => u.active || u.name === current)
        .map((u) => (
          <option key={u.name} value={u.name}>
            {u.name}
            {u.active ? "" : " (e çaktivizuar)"}
          </option>
        ))}
    </select>
  );
}

function CreateUserForm({ units, onCreated }: { units: UnitOption[]; onCreated: (u: UserView) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("PERFAQESUES");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const r = await send("/api/users", "POST", {
      name: data.get("name"),
      email: data.get("email"),
      username: data.get("username"),
      password: data.get("password"),
      role: data.get("role"),
      orgUnit: data.get("orgUnit") || null,
      mustChangePassword: data.get("mustChangePassword") === "on",
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onCreated(r.json as UserView);
    form.reset();
    setRole("PERFAQESUES");
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-4 sm:p-6 lg:self-start">
      <h2 className="text-lg font-bold">Shto përdorues</h2>
      <div>
        <label className="label" htmlFor="name">
          Emri
        </label>
        <input id="name" name="name" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="username">
          Përdoruesi
        </label>
        <input id="username" name="username" required className="field" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Fjalëkalimi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="field"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
        />
        <span>
          <span className="font-semibold">Ta ndryshojë në hyrjen e parë</span>
          <span className="block text-xs text-muted">
            I rekomanduar: fjalëkalimin përfundimtar e di vetëm përdoruesi.
          </span>
        </span>
      </label>
      <div>
        <label className="label" htmlFor="role">
          Roli
        </label>
        <select
          id="role"
          name="role"
          className="field"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">{ROLE_HINTS[role]}</p>
      </div>
      <div>
        <label className="label" htmlFor="orgUnit">
          Drejtoria / Agjencia
        </label>
        <UnitSelect id="orgUnit" name="orgUnit" units={units} defaultValue="" />
        <p className="mt-1.5 text-xs text-muted">
          {role === "MONITORUES"
            ? "Bosh = monitoron gjithë sistemin. Me drejtori = sheh vetëm kërkesat e saj."
            : "Përdoruesi sheh dhe trajton detyrat e deleguara te kjo njësi."}
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
        {loading ? "Duke ruajtur..." : "Krijo"}
      </button>
    </form>
  );
}

function EditUserForm({
  user,
  units,
  isSelf,
  onSaved,
  onCancel,
}: {
  user: UserView;
  units: UnitOption[];
  isSelf: boolean;
  onSaved: (u: UserView) => void;
  onCancel: () => void;
}) {
  const [orgUnit, setOrgUnit] = useState(user.orgUnit ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const p = `edit-${user.id}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    const r = await send(`/api/users/${user.id}`, "PATCH", {
      name: data.get("name"),
      email: data.get("email"),
      username: data.get("username"),
      role: isSelf ? user.role : data.get("role"),
      orgUnit: orgUnit || null,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onSaved(r.json as UserView);
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 rounded-xl border border-line bg-bg/60 p-3 sm:grid-cols-2 sm:p-4">
      <div>
        <label className="label" htmlFor={`${p}-name`}>
          Emri
        </label>
        <input id={`${p}-name`} name="name" required defaultValue={user.name} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-email`}>
          Email
        </label>
        <input
          id={`${p}-email`}
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-username`}>
          Përdoruesi
        </label>
        <input
          id={`${p}-username`}
          name="username"
          required
          defaultValue={user.username}
          className="field"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-role`}>
          Roli
        </label>
        <select
          id={`${p}-role`}
          name="role"
          className="field"
          defaultValue={user.role}
          disabled={isSelf}
          title={isSelf ? "Rolin tuaj nuk mund ta ndryshoni vetë" : undefined}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${p}-unit`}>
          Drejtoria / Agjencia
        </label>
        <UnitSelect id={`${p}-unit`} units={units} value={orgUnit} onChange={setOrgUnit} />
      </div>
      {error && (
        <Notice tone="error" className="sm:col-span-2">
          {error}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm disabled:opacity-60">
          {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost !py-2 text-sm">
          Anulo
        </button>
      </div>
    </form>
  );
}

function PasswordPanel({ user, onReset }: { user: UserView; onReset: (u: UserView) => void }) {
  const [busy, setBusy] = useState<"email" | "temporary" | null>(null);
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reset(mode: "email" | "temporary") {
    const question =
      mode === "email"
        ? `Dërgo te ${user.email} një lidhje për të vendosur fjalëkalim të ri?`
        : `Gjenero një fjalëkalim të përkohshëm për ${user.name}?\n\nFjalëkalimi aktual nuk do të vlejë më dhe seancat e hapura të tij mbyllen.`;
    if (!confirm(question)) return;
    setBusy(mode);
    setMsg(null);
    setTemp(null);
    const r = await send(`/api/users/${user.id}/password`, "POST", { mode });
    setBusy(null);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    if (mode === "temporary") {
      setTemp(r.json.password as string);
      onReset({ ...user, mustChangePassword: true });
    } else {
      setMsg({ ok: true, text: `Lidhja u dërgua te ${user.email}. Vlen 24 orë.` });
    }
  }

  async function copy() {
    if (!temp) return;
    await navigator.clipboard?.writeText(temp).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line bg-bg/60 p-3 sm:p-4">
      <p className="text-sm text-muted">Zgjidhni si t&apos;i jepni {user.name} një fjalëkalim të ri:</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => reset("email")}
          disabled={busy !== null}
          className="btn-ghost flex-col !items-start gap-0.5 !py-2.5 text-left text-sm disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Dërgo lidhje me email
          </span>
          <span className="text-xs font-normal text-muted">
            Përdoruesi e vendos vetë. Fjalëkalimi i vjetër vlen derisa ta ndryshojë.
          </span>
        </button>
        <button
          type="button"
          onClick={() => reset("temporary")}
          disabled={busy !== null}
          className="btn-ghost flex-col !items-start gap-0.5 !py-2.5 text-left text-sm disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {busy === "temporary" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Fjalëkalim i përkohshëm
          </span>
          <span className="text-xs font-normal text-muted">
            Kur email-i nuk funksionon. Ia jepni personalisht; në hyrje i kërkohet ta ndryshojë.
          </span>
        </button>
      </div>
      {temp && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Fjalëkalimi i përkohshëm (shfaqet vetëm tani):</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold tracking-wider text-ink">
              {temp}
            </code>
            <button type="button" onClick={copy} className={smallBtn}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "U kopjua" : "Kopjo"}
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-900/80">
            Jepjani {user.name} personalisht ose me telefon, jo me email. Në hyrjen e parë do t&apos;i
            kërkohet të vendosë fjalëkalimin e vet.
          </p>
        </div>
      )}
      <MessageNotice msg={msg} size="sm" onClose={() => setMsg(null)} />
    </div>
  );
}

function AddRolePanel({
  user,
  units,
  onAdded,
  onCancel,
}: {
  user: UserView;
  units: UnitOption[];
  onAdded: (u: UserView) => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState<Role>("PERFAQESUES");
  const [orgUnit, setOrgUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const p = `addrole-${user.id}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const r = await send(`/api/users/${user.id}/roles`, "POST", { role, orgUnit: orgUnit || null });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onAdded(r.json as UserView);
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 rounded-xl border border-line bg-bg/60 p-3 sm:grid-cols-2 sm:p-4">
      <p className="text-sm text-muted sm:col-span-2">
        Shtoni një rol tjetër për {user.name}. Në hyrje do të zgjedhë me cilin rol punon dhe mund ta ndërrojë
        kurdo.
      </p>
      <div>
        <label className="label" htmlFor={`${p}-role`}>
          Roli i ri
        </label>
        <select
          id={`${p}-role`}
          className="field"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{ROLE_HINTS[role]}</p>
      </div>
      <div>
        <label className="label" htmlFor={`${p}-unit`}>
          Drejtoria / Agjencia
        </label>
        <UnitSelect id={`${p}-unit`} units={units} value={orgUnit} onChange={setOrgUnit} />
      </div>
      {error && (
        <Notice tone="error" className="sm:col-span-2">
          {error}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm disabled:opacity-60">
          {saving ? "Duke shtuar..." : "Shto rolin"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost !py-2 text-sm">
          Anulo
        </button>
      </div>
    </form>
  );
}

function UserRow({
  user,
  units,
  isSelf,
  onChange,
}: {
  user: UserView;
  units: UnitOption[];
  isSelf: boolean;
  onChange: (u: UserView) => void;
}) {
  const [panel, setPanel] = useState<"edit" | "password" | "role" | null>(null);
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const [busy, setBusy] = useState(false);

  async function removeRole(role: ExtraRole) {
    const label = `${ROLE_LABELS[role.role]}${role.orgUnit ? ` · ${role.orgUnit}` : ""}`;
    if (!confirm(`Hiq rolin «${label}» nga ${user.name}?`)) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/users/${user.id}/roles/${role.id}`, { method: "DELETE" }).catch(() => null);
    const json = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) {
      setMsg({ ok: false, text: (json as { error?: string })?.error || "Roli nuk u hoq." });
      return;
    }
    onChange(json as UserView);
    setMsg({ ok: true, text: "Roli u hoq." });
  }

  async function toggleActive() {
    const next = !user.active;
    const question = next
      ? `Riaktivizo ${user.name}? Do të mund të hyjë sërish në sistem.`
      : `Çaktivizo ${user.name}?\n\nNuk do të mund të hyjë më dhe seancat e hapura mbyllen menjëherë. Detyrat dhe historiku i tij mbeten.`;
    if (!confirm(question)) return;
    setBusy(true);
    setMsg(null);
    const r = await send(`/api/users/${user.id}`, "PATCH", { active: next });
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    setPanel(null);
    onChange(r.json as UserView);
    setMsg({ ok: true, text: next ? "Përdoruesi u riaktivizua." : "Përdoruesi u çaktivizua." });
  }

  return (
    <li className={`px-4 py-3.5 sm:px-6 ${user.active ? "" : "bg-zinc-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className={`min-w-0 ${user.active ? "" : "opacity-60"}`}>
          <p className="font-semibold">
            {user.name}
            {isSelf && <span className="ml-1.5 text-xs font-medium text-muted">(ju)</span>}
          </p>
          <p className="break-all text-sm text-muted">
            {user.username} · {user.email}
          </p>
          {user.orgUnit ? (
            <p className="mt-1 text-xs font-medium text-brand">{shortOrgUnit(user.orgUnit)}</p>
          ) : (
            user.role === "MONITORUES" && (
              <p className="mt-1 text-xs font-medium text-sky-800">Monitoron gjithë sistemin</p>
            )
          )}
          {user.extraRoles.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[0.7rem] font-semibold text-muted">Role shtesë:</span>
              {user.extraRoles.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pl-2.5 pr-1 text-[0.7rem] font-semibold text-ink"
                >
                  {ROLE_LABELS[r.role]}
                  {r.orgUnit ? (
                    <span className="font-medium text-brand">· {shortOrgUnit(r.orgUnit)}</span>
                  ) : r.role === "MONITORUES" ? (
                    <span className="font-medium text-sky-800">· gjithë sistemi</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeRole(r)}
                    disabled={busy}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    aria-label={`Hiq rolin ${ROLE_LABELS[r.role]}`}
                    title="Hiq rolin"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {!user.active && (
              <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[0.7rem] font-semibold text-zinc-700">
                I çaktivizuar
              </span>
            )}
            {user.active && user.mustChangePassword && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-800">
                Pret ndryshimin e fjalëkalimit
              </span>
            )}
          </div>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {user.active && (
          <>
            <button
              type="button"
              onClick={() => setPanel(panel === "edit" ? null : "edit")}
              className={`${smallBtn} ${panel === "edit" ? "!border-brand !text-brand" : ""}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Ndrysho
            </button>
            {!isSelf && (
              <button
                type="button"
                onClick={() => setPanel(panel === "password" ? null : "password")}
                className={`${smallBtn} ${panel === "password" ? "!border-brand !text-brand" : ""}`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Fjalëkalimi
              </button>
            )}
          </>
        )}
        {!isSelf && (
          <button type="button" onClick={toggleActive} disabled={busy} className={smallBtn}>
            {user.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {user.active ? "Çaktivizo" : "Riaktivizo"}
          </button>
        )}
        {user.active && (
          <button
            type="button"
            onClick={() => setPanel(panel === "role" ? null : "role")}
            className={`${smallBtn} ${panel === "role" ? "!border-brand !text-brand" : ""}`}
          >
            <Plus className="h-3.5 w-3.5" />
            Shto rol
          </button>
        )}
      </div>
      {panel === "role" && (
        <AddRolePanel
          user={user}
          units={units}
          onCancel={() => setPanel(null)}
          onAdded={(u) => {
            onChange(u);
            setPanel(null);
            setMsg({ ok: true, text: "Roli u shtua. Në hyrjen e radhës do të zgjedhë me cilin rol punon." });
          }}
        />
      )}

      {panel === "edit" && (
        <EditUserForm
          user={user}
          units={units}
          isSelf={isSelf}
          onCancel={() => setPanel(null)}
          onSaved={(u) => {
            onChange(u);
            setPanel(null);
            setMsg({ ok: true, text: "Ndryshimet u ruajtën." });
          }}
        />
      )}
      {panel === "password" && <PasswordPanel user={user} onReset={onChange} />}
      <MessageNotice msg={msg} size="sm" onClose={() => setMsg(null)} className="mt-2" />
    </li>
  );
}

export function UsersManager({
  initialUsers,
  orgUnits,
  currentUserId,
}: {
  initialUsers: UserView[];
  orgUnits: UnitOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [unitFilter, setUnitFilter] = useState("");
  const active = users.filter((u) => u.active);
  const inactiveCount = users.length - active.length;
  const base = showInactive ? users : active;
  const usedUnits = [
    ...new Set(users.flatMap((u) => roleOptions(u).map((o) => o.orgUnit)).filter((n): n is string => !!n)),
  ].sort((a, b) => a.localeCompare(b));
  const needle = fold(query.trim());
  const hasRoleFilter = (u: UserView, role: Role) => roleOptions(u).some((o) => o.role === role);
  const shown = base.filter(
    (u) =>
      (!roleFilter || hasRoleFilter(u, roleFilter)) &&
      (!unitFilter ||
        roleOptions(u).some((o) => (unitFilter === NO_UNIT ? !o.orgUnit : o.orgUnit === unitFilter))) &&
      (!needle || fold(`${u.name} ${u.username} ${u.email}`).includes(needle)),
  );
  const filtering = !!(needle || roleFilter || unitFilter);
  const clearFilters = () => {
    setQuery("");
    setRoleFilter("");
    setUnitFilter("");
  };

  function replace(u: UserView) {
    setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <CreateUserForm
        units={orgUnits}
        onCreated={(u) => {
          setUsers((list) => [...list, u].sort((a, b) => a.name.localeCompare(b.name)));
          router.refresh();
        }}
      />

      <div className="surface-card overflow-hidden lg:self-start">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold">
            Përdoruesit ({filtering ? `${shown.length} nga ${base.length}` : active.length})
          </h2>
          {inactiveCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Shfaq të çaktivizuarit ({inactiveCount})
            </label>
          )}
        </div>
        <div className="grid gap-2 border-b border-line bg-bg/60 px-4 py-3 sm:grid-cols-2 sm:px-6">
          <label className="relative sm:col-span-2">
            <span className="sr-only">Kërko përdorues</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko sipas emrit, përdoruesit ose email-it..."
              className="field !pl-9"
            />
          </label>
          <label>
            <span className="sr-only">Filtro sipas rolit</span>
            <select
              className="field"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            >
              <option value="">Të gjitha rolet</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} ({base.filter((u) => hasRoleFilter(u, r)).length})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtro sipas drejtorisë</span>
            <select className="field" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
              <option value="">Të gjitha drejtoritë</option>
              <option value={NO_UNIT}>— pa drejtori —</option>
              {usedUnits.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {shown.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-muted">
            Asnjë përdorues nuk përputhet me filtrat.
            {filtering && (
              <button type="button" onClick={clearFilters} className="ml-2 font-semibold text-brand underline">
                Pastro filtrat
              </button>
            )}
          </div>
        )}
        <ul className="divide-y divide-line">
          {shown.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              units={orgUnits}
              isSelf={u.id === currentUserId}
              onChange={replace}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

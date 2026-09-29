"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/Notice";
import { ORG_UNITS, ROLE_LABELS, shortOrgUnit } from "@/lib/constants";
import type { Role } from "@/lib/types";

type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  orgUnit?: string | null;
};

export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        username: data.get("username"),
        password: data.get("password"),
        role: data.get("role"),
        orgUnit: data.get("orgUnit") || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Gabim");
      return;
    }

    const user = await res.json();
    setUsers((u) => [...u, user].sort((a, b) => a.name.localeCompare(b.name)));
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <form onSubmit={onSubmit} className="surface-card space-y-4 p-4 sm:p-6">
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
          <input id="username" name="username" required className="field" />
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
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Roli
          </label>
          <select id="role" name="role" className="field" defaultValue="PERFAQESUES">
            <option value="PERFAQESUES">Përfaqësues Drejtorie</option>
            <option value="RECEPSION">Recepsion</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="orgUnit">
            Drejtoria / Agjencia
          </label>
          <select id="orgUnit" name="orgUnit" className="field" defaultValue="">
            <option value="">— pa njësi (admin/recepsion) —</option>
            {ORG_UNITS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Përdoruesi sheh dhe trajton detyrat e deleguara te kjo njësi.
          </p>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "Duke ruajtur..." : "Krijo"}
        </button>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold">Përdoruesit ({users.length})</h2>
        </div>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 transition hover:bg-brand-soft/30 sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-muted">
                  {u.username} · {u.email}
                </p>
                {u.orgUnit && (
                  <p className="mt-1 text-xs font-medium text-brand">
                    {shortOrgUnit(u.orgUnit)}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                {ROLE_LABELS[u.role]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

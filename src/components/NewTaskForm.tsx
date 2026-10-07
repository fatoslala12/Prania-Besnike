"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/Notice";

export function NewTaskForm({ orgUnits }: { orgUnits: string[] }) {
  const router = useRouter();
  const [orgUnit, setOrgUnit] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        orgUnit: orgUnit || null,
        assigneeId: null,
        citizenName: form.get("citizenName") || null,
        citizenPhone: form.get("citizenPhone") || null,
        citizenEmail: form.get("citizenEmail") || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Gabim gjatë krijimit");
      return;
    }
    const task = await res.json();
    router.push(`/panel/detyra/${task.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface-card max-w-2xl space-y-5 p-4 sm:p-6 md:p-8">
      <div>
        <label className="label" htmlFor="title">
          Titulli *
        </label>
        <input id="title" name="title" required className="field" />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Përshkrimi *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="citizenName">
            Emri i qytetarit
          </label>
          <input id="citizenName" name="citizenName" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="citizenPhone">
            Telefoni
          </label>
          <input id="citizenPhone" name="citizenPhone" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="citizenEmail">
            Email
          </label>
          <input
            id="citizenEmail"
            name="citizenEmail"
            type="email"
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="orgUnit">
          Drejtoria / Agjencia *
        </label>
        <select
          id="orgUnit"
          name="orgUnit"
          required
          className="field"
          value={orgUnit}
          onChange={(e) => setOrgUnit(e.target.value)}
        >
          <option value="">Zgjidhni drejtorinë / agjencinë...</option>
          {orgUnits.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Çdo përdorues i kësaj drejtorie/agjencie e sheh dhe e trajton
          detyrën — pavarësisht sa përdorues ka njësia.
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary disabled:opacity-60"
      >
        {loading ? "Duke ruajtur..." : "Krijo detyrën"}
      </button>
    </form>
  );
}

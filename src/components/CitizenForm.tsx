"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Notice } from "@/components/Notice";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CitizenForm({ orgUnits }: { orgUnits: string[] }) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [pdfToken, setPdfToken] = useState<string | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setPdfToken(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/citizen-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenName: data.get("citizenName"),
          citizenEmail: data.get("citizenEmail"),
          citizenPhone: data.get("citizenPhone"),
          requestDate: data.get("requestDate"),
          orgUnit: data.get("orgUnit"),
          description: data.get("description"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
          startedAt: startedAt.current,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error || "Diçka shkoi keq. Provoni përsëri.");
        return;
      }

      setStatus("ok");
      setPdfToken(json.pdfToken ?? null);
      setMessage(
        `Kërkesa u regjistrua${json.number ? ` me numër ${json.number}` : ""}. Do t’ju përgjigjemi sa më shpejt. Asnjë qytetar pa përgjigje.`,
      );
      form.reset();
      startedAt.current = Date.now();
    } catch {
      setStatus("error");
      setMessage("Nuk u lidh me serverin. Provoni përsëri.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface-card p-6 md:p-8 space-y-5">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="citizenName">
            Emri dhe mbiemri *
          </label>
          <input
            id="citizenName"
            name="citizenName"
            required
            className="field"
            placeholder="Emri juaj"
          />
        </div>
        <div>
          <label className="label" htmlFor="requestDate">
            Data *
          </label>
          <input
            id="requestDate"
            name="requestDate"
            type="date"
            required
            defaultValue={todayIso()}
            suppressHydrationWarning
            className="field"
          />
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
            placeholder="email@shembull.al"
          />
        </div>
        <div>
          <label className="label" htmlFor="citizenPhone">
            Telefoni *
          </label>
          <input
            id="citizenPhone"
            name="citizenPhone"
            required
            className="field"
            placeholder="06x xxx xxxx"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="orgUnit">
          Drejtoria / Agjencia *
        </label>
        <select id="orgUnit" name="orgUnit" required className="field">
          <option value="">Zgjidhni...</option>
          {orgUnits.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Kërkesa / halli *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="field resize-y"
          placeholder="Përshkruani shkurt çështjen tuaj..."
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-ink/80">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 accent-[var(--brand)]"
        />
        <span>
          Jap pëlqimin për përpunimin e të dhënave personale sipas{" "}
          <a
            href="/mbrojtja-e-te-dhenave"
            className="text-brand underline underline-offset-2"
          >
            Ligjit nr. 124/2024
          </a>
          . *
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full md:w-auto disabled:opacity-60"
      >
        {status === "loading" ? "Duke dërguar..." : "Dërgo kërkesën"}
      </button>

      {message && <Notice tone={status === "ok" ? "success" : "error"}>{message}</Notice>}

      {status === "ok" && pdfToken && (
        <a
          href={`/api/citizen-request/pdf?t=${encodeURIComponent(pdfToken)}`}
          className="btn-ghost inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Shkarko fletën e kërkesës (PDF)
        </a>
      )}
    </form>
  );
}

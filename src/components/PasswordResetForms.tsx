"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageNotice, Notice, type NoticeMessage } from "@/components/Notice";

export function ForgotPasswordForm() {
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const login = String(new FormData(e.currentTarget).get("login") || "");
    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setLoading(false);
    if (!res?.ok) {
      setMsg({ ok: false, text: json?.error || "Nuk u lidh me serverin. Provoni përsëri." });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          Nëse llogaria ekziston, brenda pak minutash do të merrni një email me lidhjen për të vendosur
          fjalëkalimin e ri. Lidhja vlen 1 orë.
        </Notice>
        <p className="text-sm text-muted">
          Nuk ju erdhi? Kontrolloni edhe dosjen Spam, ose kërkojini administratorit t&apos;jua
          rivendosë.
        </p>
        <Link href="/hyr" className="btn-ghost w-full justify-center">
          Kthehu te hyrja
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="login">
          * Email ose përdoruesi
        </label>
        <input id="login" name="login" required autoComplete="username" className="field" />
      </div>
      <MessageNotice msg={msg} />
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Duke dërguar..." : "Më dërgo lidhjen"}
      </button>
      <p className="text-center text-sm">
        <Link href="/hyr" className="text-brand underline underline-offset-4">
          Kthehu te hyrja
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") || "");
    if (password !== data.get("confirm")) {
      setMsg({ ok: false, text: "Fjalëkalimi dhe konfirmimi nuk përputhen." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setLoading(false);
    if (!res?.ok) {
      setMsg({ ok: false, text: json?.error || "Nuk u lidh me serverin. Provoni përsëri." });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Notice tone="success">Fjalëkalimi u ndryshua. Tani mund të hyni me fjalëkalimin e ri.</Notice>
        <Link href="/hyr" className="btn-primary w-full justify-center">
          Hyr
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="password">
          * Fjalëkalimi i ri
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
        <p className="mt-1.5 text-xs text-muted">Të paktën 10 karaktere.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          * Përsërit fjalëkalimin
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="field"
        />
      </div>
      <MessageNotice msg={msg} />
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Duke ruajtur..." : "Ruaj fjalëkalimin"}
      </button>
    </form>
  );
}

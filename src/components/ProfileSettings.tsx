"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { MessageNotice, type NoticeMessage } from "@/components/Notice";

type Props = {
  username: string;
  email: string;
  emailNotifications: boolean;
};

async function patchProfile(body: object): Promise<NoticeMessage & { json?: Record<string, unknown> }> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const json = await res?.json().catch(() => ({}));
  if (!res?.ok) return { ok: false, text: json?.error || "Ndodhi një gabim. Provoni sërish." };
  return { ok: true, text: "", json };
}

export function ProfileSettings({ username, email, emailNotifications }: Props) {
  const [notify, setNotify] = useState(emailNotifications);
  const [prefsMsg, setPrefsMsg] = useState<NoticeMessage | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [pwMsg, setPwMsg] = useState<NoticeMessage | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function toggleNotify(next: boolean) {
    setSavingPrefs(true);
    setPrefsMsg(null);
    const r = await patchProfile({ emailNotifications: next });
    setSavingPrefs(false);
    if (!r.ok) {
      setPrefsMsg(r);
      return;
    }
    setNotify(next);
    setPrefsMsg({
      ok: true,
      text: next
        ? "Do të merrni njoftimet edhe me email."
        : "Njoftimet me email u çaktivizuan. Do t'i shihni vetëm te zilja në panel.",
    });
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== data.get("confirmPassword")) {
      setPwMsg({ ok: false, text: "Fjalëkalimi i ri dhe konfirmimi nuk përputhen." });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    const r = await patchProfile({ currentPassword: data.get("currentPassword"), newPassword });
    setSavingPw(false);
    if (!r.ok) {
      setPwMsg(r);
      return;
    }
    form.reset();
    setPwMsg({ ok: true, text: "Fjalëkalimi u ndryshua. Herën tjetër hyni me fjalëkalimin e ri." });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={onPassword} className="surface-card space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold">Ndrysho fjalëkalimin</h2>
        </div>
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <div>
          <label className="label" htmlFor="currentPassword">
            Fjalëkalimi aktual
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">
            Fjalëkalimi i ri
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className="field"
          />
          <p className="mt-1.5 text-xs text-muted">Të paktën 10 karaktere.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            Përsërit fjalëkalimin e ri
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className="field"
          />
        </div>
        <MessageNotice msg={pwMsg} />
        <button type="submit" disabled={savingPw} className="btn-primary w-full disabled:opacity-60 sm:w-auto">
          {savingPw ? "Duke ruajtur..." : "Ruaj fjalëkalimin"}
        </button>
      </form>

      <section className="surface-card space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold">Njoftimet me email</h2>
        </div>
        <p className="text-sm text-muted">
          Njoftimet dërgohen te <span className="font-semibold text-ink">{email}</span>. Te zilja në
          panel i shihni gjithmonë, edhe kur email-i është i çaktivizuar.
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 transition hover:border-brand/40">
          <input
            type="checkbox"
            checked={notify}
            disabled={savingPrefs}
            onChange={(e) => toggleNotify(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-sm font-semibold">Merr njoftime me email</span>
            <span className="block text-xs text-muted">
              Detyra të reja, ri-delegime, përgjigje, komente dhe kujtesa ditore për kërkesat e
              vonuara.
            </span>
          </span>
        </label>
        <MessageNotice msg={prefsMsg} />
      </section>
    </div>
  );
}

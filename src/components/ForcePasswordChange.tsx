"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MessageNotice, type NoticeMessage } from "@/components/Notice";

export function ForcePasswordChange({ name, username }: { name: string; username: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<NoticeMessage | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== data.get("confirmPassword")) {
      setMsg({ ok: false, text: "Fjalëkalimi i ri dhe konfirmimi nuk përputhen." });
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setSaving(false);
      setMsg({ ok: false, text: json?.error || "Ndodhi një gabim. Provoni sërish." });
      return;
    }
    setMsg({ ok: true, text: "Fjalëkalimi u ndryshua. Po hapet paneli..." });
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-bg px-4 py-10 hero-wash">
      <BrandMark size="md" align="center" />
      <form onSubmit={onSubmit} className="surface-card mt-8 w-full max-w-md space-y-4 p-6 md:p-8">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-brand" />
          <h1 className="text-xl font-extrabold">Vendosni fjalëkalimin tuaj</h1>
        </div>
        <p className="text-sm text-muted">
          Përshëndetje {name}. Administratori ju ka dhënë një fjalëkalim të përkohshëm. Para se të
          vazhdoni, zgjidhni një fjalëkalim të ri që e dini vetëm ju.
        </p>
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <div>
          <label className="label" htmlFor="currentPassword">
            Fjalëkalimi i përkohshëm
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
        <MessageNotice msg={msg} />
        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
          {saving ? "Duke ruajtur..." : "Ruaj dhe vazhdo"}
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/hyr" })}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand"
        >
          <LogOut className="h-4 w-4" />
          Dil
        </button>
      </form>
    </div>
  );
}

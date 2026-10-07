"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Notice } from "@/components/Notice";

export function LoginForm({ showDemo = false }: { showDemo?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("callbackUrl") || "";
  const callbackUrl =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/panel";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const login = String(form.get("login") || "");
    const password = String(form.get("password") || "");

    const res = await signIn("credentials", {
      login,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email/përdoruesi ose fjalëkalimi janë të pasaktë.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="login">
          * Email ose përdoruesi
        </label>
        <input
          id="login"
          name="login"
          required
          autoComplete="username"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          * Fjalëkalimi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-60"
      >
        {loading ? "Duke hyrë..." : "Hyr"}
      </button>

      {showDemo && (
        <div className="rounded-xl border border-brand/15 bg-brand-soft/60 px-3 py-2.5 text-center text-xs text-ink/70">
          <p className="font-semibold text-brand">Demo lokal</p>
          <p className="mt-1">
            <code>admin</code> / <code>recepsion</code> / <code>perfaqesues</code>
          </p>
          <p>
            Fjalëkalimi: <code className="font-semibold">Prania2026!</code>
          </p>
        </div>
      )}

      <p className="text-center text-sm">
        <Link href="/hyr/harrova" className="text-brand underline underline-offset-4">
          Harrova fjalëkalimin
        </Link>
      </p>
    </form>
  );
}

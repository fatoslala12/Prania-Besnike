"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Clock } from "lucide-react";
import {
  IDLE_LOGOUT_COOKIE,
  IDLE_PING_MS,
  IDLE_TIMEOUT_LABEL,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  idleLoginUrl,
} from "@/lib/idle";

/** Të përbashkëta për të gjitha skedat: puna në njërën skedë i mban gjallë të gjitha. */
const ACTIVITY_KEY = "pb:lastActivity";
const PING_KEY = "pb:lastPing";
const LOGOUT_KEY = "pb:idleLogout";
const WRITE_EVERY_MS = 10_000;
const EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "wheel", "scroll"] as const;

function readTime(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeTime(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Shfletim privat / hapësirë e plotë: numëruesi vazhdon vetëm për këtë skedë.
  }
}

export function IdleLogout() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const lastWrite = useRef(0);
  const leaving = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const markActive = useCallback((pingNow = false) => {
    if (leaving.current) return;
    const now = Date.now();
    if (!pingNow && now - lastWrite.current < WRITE_EVERY_MS) return;
    lastWrite.current = now;
    writeTime(ACTIVITY_KEY, now);
    if (pingNow || now - readTime(PING_KEY) >= IDLE_PING_MS) {
      writeTime(PING_KEY, now);
      void fetch("/api/session/activity", { method: "POST", cache: "no-store" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const logout = async () => {
      if (leaving.current) return;
      leaving.current = true;
      setRemaining(null);
      const url = idleLoginUrl(pathRef.current);
      const now = Date.now();
      if (now - readTime(LOGOUT_KEY) < 15_000) {
        // Një skedë tjetër po e mbyll sesionin; kjo vetëm pret pak dhe shkon te hyrja.
        setTimeout(() => window.location.assign(url), 1500);
        return;
      }
      writeTime(LOGOUT_KEY, now);
      document.cookie = `${IDLE_LOGOUT_COOKIE}=idle; path=/; max-age=60; samesite=lax`;
      await signOut({ callbackUrl: url });
    };

    const check = () => {
      if (leaving.current) return;
      const last = readTime(ACTIVITY_KEY) || lastWrite.current;
      const left = IDLE_TIMEOUT_MS - (Date.now() - last);
      if (left <= 0) {
        void logout();
        return;
      }
      setRemaining(left <= IDLE_WARNING_MS ? left : null);
    };

    const onActivity = () => markActive();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    markActive();
    for (const name of EVENTS) {
      window.addEventListener(name, onActivity, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 1000);
    return () => {
      for (const name of EVENTS) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [markActive]);

  if (remaining === null) return null;

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-desc"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center print:hidden"
    >
      <div className="surface-card w-full max-w-sm p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Clock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id="idle-title" className="mt-4 text-lg font-extrabold">
          A jeni ende këtu?
        </h2>
        <p id="idle-desc" className="mt-2 text-sm text-muted">
          Nuk keni bërë asnjë veprim prej gati {IDLE_TIMEOUT_LABEL}. Për sigurinë e të dhënave, do të dilni
          automatikisht pas
        </p>
        <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand" data-testid="idle-countdown">
          {clock}
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="btn-primary sm:order-2"
            autoFocus
            onClick={() => {
              markActive(true);
              setRemaining(null);
            }}
          >
            Vazhdo punën
          </button>
          <button type="button" className="btn-ghost sm:order-1" onClick={() => signOut({ callbackUrl: "/" })}>
            Dil tani
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationView } from "@/lib/types";

const POLL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { items: NotificationView[]; unread: number };
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(body: { ids?: string[]; all?: boolean }) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
  }

  async function openItem(n: NotificationView) {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
      markRead({ ids: [n.id] });
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
    setUnread(0);
    await markRead({ all: true });
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink/70 transition hover:border-brand hover:text-brand"
        aria-label={unread ? `Njoftime (${unread} të palexuara)` : "Njoftime"}
        aria-expanded={open}
      >
        <Bell className="h-[1.1rem] w-[1.1rem]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">
              Njoftime
              {unread > 0 && <span className="ml-1.5 text-brand">({unread})</span>}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Shëno të lexuara
              </button>
            )}
          </div>
          <ul className="max-h-[min(70vh,28rem)] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">
                Nuk keni njoftime.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-brand-soft/30 ${
                    n.readAt ? "" : "bg-brand-soft/20"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.readAt ? "bg-transparent" : "bg-brand"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm leading-snug ${n.readAt ? "text-ink/80" : "font-semibold text-ink"}`}
                    >
                      {n.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-xs text-muted">
                      {n.body}
                    </span>
                    <span className="mt-1 block text-[0.7rem] text-muted">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: sq })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

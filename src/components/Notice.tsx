"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type NoticeTone = "success" | "error" | "info";
export type NoticeMessage = { ok: boolean; text: string };

const TONES: Record<NoticeTone, { box: string; icon: typeof Info }> = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CheckCircle2 },
  error: { box: "border-brand/25 bg-brand-soft text-brand-dark", icon: AlertCircle },
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: Info },
};

export function Notice({
  tone,
  children,
  onClose,
  size = "md",
  className = "",
}: {
  tone: NoticeTone;
  children: React.ReactNode;
  onClose?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const { box, icon: Icon } = TONES[tone];
  const small = size === "sm";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border ${box} ${
        small ? "px-3 py-2 text-xs" : "px-3.5 py-2.5 text-sm"
      } leading-relaxed animate-notice ${className}`}
    >
      <Icon className={`${small ? "h-4 w-4" : "h-[1.1rem] w-[1.1rem]"} mt-px shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Mbyll njoftimin"
          className="-m-1 shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function MessageNotice({
  msg,
  onClose,
  size,
  className,
}: {
  msg: NoticeMessage | null;
  onClose?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!msg) return null;
  return (
    <Notice tone={msg.ok ? "success" : "error"} onClose={onClose} size={size} className={className}>
      {msg.text}
    </Notice>
  );
}

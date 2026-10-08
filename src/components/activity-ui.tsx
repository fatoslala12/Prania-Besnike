import Link from "next/link";
import { format } from "date-fns";
import { Bell, Bot, Monitor, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import type { DeviceInfo } from "@/lib/audit-catalog";

const TABS = [
  { key: "activity", href: "/panel/aktiviteti", label: "Aktiviteti", icon: ShieldCheck },
  { key: "notifications", href: "/panel/aktiviteti/njoftimet", label: "Njoftimet", icon: Bell },
] as const;

export function ActivityTabs({ active, query }: { active: (typeof TABS)[number]["key"]; query?: string }) {
  return (
    <nav className="grid grid-cols-2 rounded-full border border-line bg-white p-1 sm:inline-grid" aria-label="Aktiviteti">
      {TABS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={query ? `${href}?${query}` : href}
          aria-current={active === key ? "page" : undefined}
          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === key ? "bg-brand text-white shadow-sm" : "text-ink/65 hover:text-brand"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export type KpiTone = "default" | "ok" | "bad" | "warn";

const KPI_ACCENT: Record<KpiTone, string> = {
  default: "bg-ink/10",
  ok: "bg-emerald-500",
  bad: "bg-rose-500",
  warn: "bg-amber-500",
};

export function Kpi({
  label,
  value,
  sub,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: KpiTone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card relative overflow-hidden p-3.5 sm:p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${KPI_ACCENT[tone]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.68rem] font-semibold uppercase leading-tight tracking-wide text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-ink/30" />}
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">{sub}</p>}
    </div>
  );
}

export function SectionHead({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-bold sm:text-lg">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">{children}</p>;
}

/** Ngjyra të qëndrueshme për pjesët e grafikëve (hex, sepse përdoren në conic-gradient). */
export const CHART_COLORS = ["#a63240", "#0f766e", "#d97706", "#2563eb", "#7c3aed", "#db2777", "#65a30d", "#94a3b8"];

export function Donut({
  parts,
  center,
  centerSub,
}: {
  parts: { label: string; value: number; color: string }[];
  center: React.ReactNode;
  centerSub: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  let acc = 0;
  const stops = parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const start = (acc / total) * 360;
      acc += p.value;
      return `${p.color} ${start}deg ${(acc / total) * 360}deg`;
    });
  return (
    <div
      className="relative mx-auto aspect-square w-36 shrink-0 rounded-full sm:w-40"
      style={{ background: total ? `conic-gradient(${stops.join(", ")})` : "#f1f1f1" }}
      role="img"
      aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}
    >
      <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-2xl font-extrabold tabular-nums">{center}</span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{centerSub}</span>
      </div>
    </div>
  );
}

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, bot: Bot } as const;
const DEVICE_LABEL = { mobile: "Celular", tablet: "Tablet", desktop: "Kompjuter", bot: "Skript" } as const;

export function DeviceBadge({ device, compact }: { device: DeviceInfo; compact?: boolean }) {
  const Icon = DEVICE_ICON[device.device];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-ink/70" title={`${DEVICE_LABEL[device.device]} · ${device.os} · ${device.browser}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${device.device === "bot" ? "text-rose-600" : "text-ink/45"}`} />
      <span className="truncate">{compact ? device.browser : `${device.os} · ${device.browser}`}</span>
    </span>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function ago(iso: string, now = new Date()) {
  const s = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (s < 60) return "tani";
  const m = Math.round(s / 60);
  if (m < 60) return `para ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `para ${h} orësh`;
  const d = Math.round(h / 24);
  if (d < 8) return d === 1 ? "dje" : `para ${d} ditësh`;
  return format(new Date(iso), "dd.MM.yyyy");
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition";
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Faqet">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${btn} border-line bg-white hover:border-brand hover:text-brand`}>‹ Para</Link>
      ) : (
        <span className={`${btn} border-line text-ink/30`}>‹ Para</span>
      )}
      <span className="text-xs text-muted">
        Faqja <b className="text-ink">{page}</b> nga {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={`${btn} border-line bg-white hover:border-brand hover:text-brand`}>Pas ›</Link>
      ) : (
        <span className={`${btn} border-line text-ink/30`}>Pas ›</span>
      )}
    </nav>
  );
}

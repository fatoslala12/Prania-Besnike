import { Building2, ConciergeBell, Eye, BriefcaseBusiness, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";

export const ROLE_STYLES: Record<Role, { icon: LucideIcon; bubble: string; ring: string }> = {
  ADMIN: { icon: ShieldCheck, bubble: "bg-brand-soft text-brand", ring: "hover:border-brand" },
  ADMINISTRATOR: {
    icon: BriefcaseBusiness,
    bubble: "bg-amber-100 text-amber-800",
    ring: "hover:border-amber-500",
  },
  RECEPSION: {
    icon: ConciergeBell,
    bubble: "bg-emerald-100 text-emerald-800",
    ring: "hover:border-emerald-500",
  },
  PERFAQESUES: {
    icon: Building2,
    bubble: "bg-indigo-100 text-indigo-800",
    ring: "hover:border-indigo-500",
  },
  MONITORUES: { icon: Eye, bubble: "bg-sky-100 text-sky-800", ring: "hover:border-sky-500" },
};

export function RoleIcon({ role, className = "" }: { role: Role; className?: string }) {
  const { icon: Icon, bubble } = ROLE_STYLES[role];
  return (
    <span className={`inline-flex items-center justify-center rounded-2xl ${bubble} ${className}`}>
      <Icon className="h-1/2 w-1/2" aria-hidden="true" />
    </span>
  );
}

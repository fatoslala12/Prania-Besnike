import type { Role } from "@/lib/types";

export type { Role };

export const ROLE_LABELS: Record<Role, string> = {
  PERFAQESUES: "Përfaqësues Drejtorie",
  RECEPSION: "Recepsion",
  ADMIN: "Administrator",
};

export const STATUS_LABELS = {
  I_RI: "I ri",
  NE_PROCES: "Në proces",
  PERFUNDUAR: "Përfunduar",
  BLOKUAR: "Bllokuar",
} as const;

/** Drejtori & agjensi — lista fillestare (mund të shtohen më vonë) */
export const ORG_UNITS = [
  "Agjencia e Sigurimit dhe Cilësisë së Kujdesit Shëndetësor",
  "Agjencia Kombëtare e Barnave",
  "Agjencia Shtetërore për Mbrojtjen e të Drejtave të Fëmijëve",
  "Drejtoria e Barazisë Gjinore",
  "Drejtoria e Buxhetit",
  "Drejtoria e Farmaceutikës dhe PM",
  "Drejtoria e Inteligjencës Artificiale dhe Analizës së të Dhënave",
  "Drejtoria e Kujdesit Parësor",
  "Drejtoria e Politikave Sociale",
  "Drejtoria e Shërbimit Spitalor",
  "Drejtoria Juridike",
  "Instituti i Shëndetit Publik",
  "OSHKSH",
] as const;

export type OrgUnit = (typeof ORG_UNITS)[number];

export function isOrgUnit(value: unknown): value is OrgUnit {
  return typeof value === "string" && (ORG_UNITS as readonly string[]).includes(value);
}

export function canCreateTask(role: Role) {
  return role === "ADMIN" || role === "RECEPSION";
}

export function canAssignTask(role: Role) {
  return role === "ADMIN" || role === "RECEPSION";
}

/** Çdo rol me akses te detyra mund ta ri-delegojë (Drejtoria vetëm detyrat e veta). */
export function canRedelegate(role: Role) {
  return role === "ADMIN" || role === "RECEPSION" || role === "PERFAQESUES";
}

export function canViewReports(role: Role) {
  return role === "ADMIN" || role === "RECEPSION";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canSeeAllTasks(role: Role) {
  return role === "ADMIN" || role === "RECEPSION";
}

export function canAccessTask(
  user: { id: string; role: Role; orgUnit?: string | null },
  task: { assigneeId: string | null; orgUnit: string | null },
) {
  if (canSeeAllTasks(user.role)) return true;
  if (task.assigneeId && task.assigneeId === user.id) return true;
  return !!user.orgUnit && task.orgUnit === user.orgUnit;
}

export function shortOrgUnit(name: string) {
  if (name === "OSHKSH") return "OSHKSH";
  if (name.startsWith("Drejtoria ")) return name.replace("Drejtoria ", "Dr. ");
  if (name.startsWith("Agjencia ")) return name.replace("Agjencia ", "Agj. ");
  if (name.startsWith("Instituti ")) return name.replace("Instituti ", "Inst. ");
  return name.length > 42 ? name.slice(0, 40) + "…" : name;
}

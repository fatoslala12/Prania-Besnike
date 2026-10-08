import type { Role } from "@/lib/types";

export type { Role };

export const ROLE_LABELS: Record<Role, string> = {
  PERFAQESUES: "Përfaqësues Drejtorie",
  RECEPSION: "Recepsion",
  ADMINISTRATOR: "Administrator",
  ADMIN: "Super Administrator",
  MONITORUES: "Monitorues",
};

/** Përshkrim i shkurtër për kartat e zgjedhjes së rolit. */
export const ROLE_SUMMARIES: Record<Role, string> = {
  PERFAQESUES: "Trajtoni kërkesat e deleguara te drejtoria juaj.",
  RECEPSION: "Regjistroni dhe delegoni kërkesat; shihni gjithçka dhe raportet.",
  ADMINISTRATOR: "Regjistroni, delegoni dhe ndiqni të gjitha kërkesat, me raportet.",
  ADMIN: "Administrim i plotë: përdoruesit, drejtoritë dhe të gjitha kërkesat.",
  MONITORUES: "Vetëm shikim: ndiqni kërkesat pa ndryshuar asgjë.",
};

export const STATUS_LABELS = {
  I_RI: "I ri",
  NE_PROCES: "Në proces",
  PERFUNDUAR: "Përfunduar",
  BLOKUAR: "Bllokuar",
} as const;

/**
 * Lista fillestare e drejtorive & agjencive. Lista e vërtetë mbahet në databazë
 * (Përdoruesit → Drejtoritë); kjo përdoret vetëm për mbushjen e parë të saj.
 */
export const DEFAULT_ORG_UNITS = [
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

export function normalizeOrgUnitName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Rolet që regjistrojnë, delegojnë dhe shohin gjithë kërkesat. Administratori është
 * si Recepsioni; vetëm Super Administratori (ADMIN) menaxhon përdoruesit/drejtoritë.
 */
export function isManagerRole(role: Role) {
  return role === "ADMIN" || role === "ADMINISTRATOR" || role === "RECEPSION";
}

export function canCreateTask(role: Role) {
  return isManagerRole(role);
}

export function canAssignTask(role: Role) {
  return isManagerRole(role);
}

/** Çdo rol me akses te detyra mund ta ri-delegojë (Drejtoria vetëm detyrat e veta). */
export function canRedelegate(role: Role) {
  return isManagerRole(role) || role === "PERFAQESUES";
}

/**
 * Monitoruesi sheh, por nuk ndryshon asgjë. Pa drejtori monitoron gjithë sistemin;
 * me drejtori vetëm kërkesat e asaj drejtorie.
 */
export function isReadOnlyRole(role: Role) {
  return role === "MONITORUES";
}

type ScopedUser = { role: Role; orgUnit?: string | null };

export function canSeeAllTasks(user: ScopedUser) {
  return isManagerRole(user.role) || (user.role === "MONITORUES" && !user.orgUnit);
}

export function canViewReports(user: ScopedUser) {
  return canSeeAllTasks(user);
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

/** Regjistri i hyrjeve (IP, pajisje) dhe analiza e njoftimeve: vetëm Super Administratori. */
export function canViewActivity(role: Role) {
  return role === "ADMIN";
}

export function canAccessTask(
  user: { id: string; role: Role; orgUnit?: string | null },
  task: { assigneeId: string | null; orgUnit: string | null },
) {
  if (canSeeAllTasks(user)) return true;
  if (task.assigneeId && task.assigneeId === user.id) return true;
  return !!user.orgUnit && task.orgUnit === user.orgUnit;
}

/** Përgjigje shkruan kushdo që ka akses te kërkesa, pasi ajo t'i jetë deleguar një drejtorie. */
export function canRespond(
  user: { id: string; role: Role; orgUnit?: string | null },
  task: { assigneeId: string | null; orgUnit: string | null },
) {
  return !isReadOnlyRole(user.role) && !!task.orgUnit && canAccessTask(user, task);
}

export function shortOrgUnit(name: string) {
  if (name === "OSHKSH") return "OSHKSH";
  if (name.startsWith("Drejtoria ")) return name.replace("Drejtoria ", "Dr. ");
  if (name.startsWith("Agjencia ")) return name.replace("Agjencia ", "Agj. ");
  if (name.startsWith("Instituti ")) return name.replace("Instituti ", "Inst. ");
  return name.length > 42 ? name.slice(0, 40) + "…" : name;
}

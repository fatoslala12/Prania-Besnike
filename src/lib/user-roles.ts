import type { ExtraRole, Role } from "@/lib/types";

/** Çelësi i rolit kryesor (User.role); rolet shtesë identifikohen me id-në e tyre. */
export const PRIMARY_ROLE_KEY = "primary";

export type RoleOption = { key: string; role: Role; orgUnit: string | null };

type WithRoles = { role: Role; orgUnit: string | null; extraRoles?: ExtraRole[] };

export function roleOptions(user: WithRoles): RoleOption[] {
  return [
    { key: PRIMARY_ROLE_KEY, role: user.role, orgUnit: user.orgUnit },
    ...(user.extraRoles ?? []).map((r) => ({ key: r.id, role: r.role, orgUnit: r.orgUnit })),
  ];
}

export function findRoleOption(user: WithRoles, key: string | null | undefined) {
  return key ? roleOptions(user).find((o) => o.key === key) ?? null : null;
}

export function hasRole(user: WithRoles, role: Role) {
  return roleOptions(user).some((o) => o.role === role);
}

export function hasRoleAssignment(user: WithRoles, role: Role, orgUnit: string | null) {
  return roleOptions(user).some((o) => o.role === role && (o.orgUnit ?? null) === (orgUnit ?? null));
}

/**
 * Një hyrje për çdo rol të përdoruesit (i njëjti id), që njoftimet/kujtesat
 * të llogariten për të gjitha rolet, jo vetëm për atë kryesor.
 */
export function expandRoles<T extends WithRoles>(users: T[]): T[] {
  return users.flatMap((u) => roleOptions(u).map((o) => ({ ...u, role: o.role, orgUnit: o.orgUnit })));
}

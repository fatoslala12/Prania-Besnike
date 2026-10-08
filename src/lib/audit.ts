import { headers as requestHeaders } from "next/headers";
import { AUDIT_ACTIONS, AUDIT_RETENTION_DAYS, type AuditAction } from "@/lib/audit-catalog";
import { clientIp } from "@/lib/rate-limit";
import { addAuditLog, pruneAuditLogs } from "@/lib/repo";
import type { NewAuditEntry } from "@/lib/types";

type SessionLike = { user: { id: string; name?: string | null; role: string } } | null | undefined;

export function auditActor(session: SessionLike) {
  return session?.user
    ? { userId: session.user.id, userName: session.user.name ?? null, role: session.user.role }
    : {};
}

const cut = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

/**
 * Regjistron një veprim. Nuk hedh kurrë gabim: dështimi i regjistrit s'duhet të ndalë veprimin.
 * Pa `headers`, IP-ja dhe pajisja merren nga kërkesa aktuale; `headers: null` i lë bosh.
 */
export async function recordAudit(
  action: AuditAction,
  entry: Omit<NewAuditEntry, "action" | "module"> = {},
  opts: { headers?: Headers | null } = {},
) {
  try {
    let h = opts.headers;
    if (h === undefined) h = await requestHeaders().catch(() => null);
    const ip = h ? clientIp(h) : null;
    await addAuditLog({
      ...entry,
      action,
      module: AUDIT_ACTIONS[action].module,
      ip: entry.ip ?? (ip && ip !== "unknown" ? ip : null),
      userAgent: cut(entry.userAgent ?? h?.get("user-agent"), 400),
      login: cut(entry.login, 200),
      targetLabel: cut(entry.targetLabel, 300),
      details: cut(entry.details, 1000),
      reason: cut(entry.reason, 300),
    });
    void pruneOccasionally();
  } catch (e) {
    console.error("Regjistri i aktivitetit dështoi", e);
  }
}

const g = globalThis as typeof globalThis & { __praniaAuditPrunedAt?: number };

async function pruneOccasionally() {
  const now = Date.now();
  if (g.__praniaAuditPrunedAt && now - g.__praniaAuditPrunedAt < 12 * 60 * 60 * 1000) return;
  g.__praniaAuditPrunedAt = now;
  try {
    await pruneAuditLogs(new Date(now - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000));
  } catch (e) {
    console.error("Pastrimi i regjistrit dështoi", e);
  }
}

import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 24 * 60 * 60_000;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET mungon");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`citizen-pdf:${payload}`).digest("base64url");
}

/** Lejon qytetarin të shkarkojë fletën e vet pa hyrë në sistem, pa u ekspozuar numrat e tjerë. */
export function createPdfToken(taskId: string, now = Date.now()) {
  const payload = Buffer.from(`${taskId}.${now + TTL_MS}`).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyPdfToken(token: string | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [taskId, exp] = Buffer.from(payload, "base64url").toString().split(".");
  if (!taskId || !(Number(exp) > Date.now())) return null;
  return taskId;
}

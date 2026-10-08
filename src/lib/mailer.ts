import nodemailer, { type Transporter } from "nodemailer";
import { recordAudit } from "@/lib/audit";

let transporter: Transporter | null = null;

export function mailEnabled() {
  if (!process.env.SMTP_HOST) return false;
  return !process.env.SMTP_USER || Boolean(process.env.SMTP_PASS);
}

/** Google e shfaq App Password-in me hapësira ("abcd efgh ijkl mnop"); vetë kodi s'i ka ato. */
function smtpPassword() {
  const pass = process.env.SMTP_PASS ?? "";
  return /gmail\.com$/i.test(process.env.SMTP_HOST ?? "") ? pass.replace(/\s+/g, "") : pass;
}

/** Gmail e shënon si abuzim hapjen e shumë lidhjeve njëkohësisht; pool + ritëm i kufizuar. */
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 3,
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: smtpPassword() }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Lidhjet drejt domeneve wildcard (nip.io, sslip.io) ose IP-ve të zhveshura
 * i çojnë filtrat anti-spam te "phishing"; në atë rast emaili dërgohet pa lidhje.
 */
const UNTRUSTED_HOST = /(^|\.)(nip\.io|sslip\.io|localhost)$|^\d{1,3}(\.\d{1,3}){3}$/i;

export function publicLink(path: string): string | null {
  const base = process.env.APP_URL || process.env.AUTH_URL;
  if (!base) return null;
  try {
    const url = new URL(path, base);
    return UNTRUSTED_HOST.test(url.hostname) ? null : url.toString();
  } catch {
    return null;
  }
}

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };

export async function sendMail(msg: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
  /** Njoftimet automatike: shmang përgjigjet automatike "Out of office". */
  automated?: boolean;
}) {
  if (!mailEnabled()) return;
  const { automated, ...mail } = msg;
  const logged = { targetLabel: msg.to, details: msg.subject };
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      replyTo: process.env.MAIL_REPLY_TO || process.env.SMTP_USER,
      headers: automated
        ? { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" }
        : undefined,
      ...mail,
    });
  } catch (e) {
    const reason = e instanceof Error ? `${(e as { code?: string }).code ?? ""} ${e.message}`.trim() : "Gabim i panjohur";
    await recordAudit("EMAIL_FAILED", { ...logged, success: false, reason }, { headers: null });
    throw e;
  }
  await recordAudit("EMAIL_SENT", logged, { headers: null });
}

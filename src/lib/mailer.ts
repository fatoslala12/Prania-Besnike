import nodemailer, { type Transporter } from "nodemailer";

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

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
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

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };

export async function sendMail(msg: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}) {
  if (!mailEnabled()) return;
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    ...msg,
  });
}

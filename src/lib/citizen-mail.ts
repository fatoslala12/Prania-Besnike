import { escapeHtml, renderEmail } from "@/lib/email-template";
import { mailEnabled, sendMail, type MailAttachment } from "@/lib/mailer";

export const MAIL_DISABLED_ERROR =
  "Dërgimi i emailit nuk është konfiguruar në server (SMTP). Kontaktoni administratorin.";

export async function mailToCitizen(opts: {
  to: string;
  citizenName: string | null;
  subject: string;
  intro: string;
  /** Tekst i lirë nga stafi; dërgohet i escape-uar. */
  note?: string | null;
  attachment: MailAttachment;
  attachmentLabel: string;
}) {
  if (!mailEnabled()) throw new Error("MAIL_DISABLED");
  const greeting = opts.citizenName ? `I/E nderuar ${opts.citizenName},` : "I/E nderuar,";
  const note = opts.note?.trim() || "";
  const outro = `${opts.attachmentLabel} gjendet bashkëngjitur këtij emaili.\n\nMe respekt,\nMinistria e Shëndetësisë dhe Mirëqenies Sociale`;
  const text = `${greeting}\n\n${opts.intro}${note ? `\n\n${note}` : ""}\n\n${outro}\n\n— Prania Besnike · MSHMS`;
  const html = renderEmail({
    title: opts.subject,
    band: "MINISTRIA E SHËNDETËSISË DHE MIRËQENIES SOCIALE",
    preheader: opts.intro.slice(0, 140),
    bodyHtml: `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 14px;white-space:pre-line">${escapeHtml(opts.intro)}</p>
${note ? `<p style="margin:0 0 14px;white-space:pre-line">${escapeHtml(note)}</p>\n` : ""}<p style="margin:0;white-space:pre-line">${escapeHtml(outro)}</p>`,
    footer:
      "Prania Besnike · MSHMS. Ky email ju është dërguar sepse keni paraqitur një kërkesë pranë Ministrisë. Për pyetje mund t'i përgjigjeni këtij emaili.",
  });

  await sendMail({ to: opts.to, subject: opts.subject, text, html, attachments: [opts.attachment] });
}

export async function mailPdfToCitizen(opts: {
  to: string;
  citizenName: string | null;
  subject: string;
  intro: string;
  filename: string;
  pdf: Buffer;
}) {
  await mailToCitizen({
    to: opts.to,
    citizenName: opts.citizenName,
    subject: opts.subject,
    intro: opts.intro,
    attachment: { filename: opts.filename, content: opts.pdf, contentType: "application/pdf" },
    attachmentLabel: "Dokumenti në formatin PDF",
  });
}

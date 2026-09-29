import { escapeHtml, renderEmail } from "@/lib/email-template";
import { mailEnabled, sendMail } from "@/lib/mailer";

export const MAIL_DISABLED_ERROR =
  "Dërgimi i emailit nuk është konfiguruar në server (SMTP). Kontaktoni administratorin.";

export async function mailPdfToCitizen(opts: {
  to: string;
  citizenName: string | null;
  subject: string;
  intro: string;
  filename: string;
  pdf: Buffer;
}) {
  if (!mailEnabled()) throw new Error("MAIL_DISABLED");
  const greeting = opts.citizenName ? `I/E nderuar ${opts.citizenName},` : "I/E nderuar,";
  const outro =
    "Dokumenti gjendet bashkëngjitur këtij emaili në formatin PDF.\n\nMe respekt,\nMinistria e Shëndetësisë dhe Mirëqenies Sociale";
  const text = `${greeting}\n\n${opts.intro}\n\n${outro}\n\n— Prania Besnike · MSHMS`;
  const html = renderEmail({
    title: opts.subject,
    band: "MINISTRIA E SHËNDETËSISË DHE MIRËQENIES SOCIALE",
    preheader: opts.intro.slice(0, 140),
    bodyHtml: `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 14px;white-space:pre-line">${escapeHtml(opts.intro)}</p>
<p style="margin:0;white-space:pre-line">${escapeHtml(outro)}</p>`,
    footer:
      "Prania Besnike · MSHMS. Ky email ju është dërguar sepse keni paraqitur një kërkesë pranë Ministrisë. Për pyetje mund t'i përgjigjeni këtij emaili.",
  });

  await sendMail({
    to: opts.to,
    subject: opts.subject,
    text,
    html,
    attachments: [{ filename: opts.filename, content: opts.pdf, contentType: "application/pdf" }],
  });
}

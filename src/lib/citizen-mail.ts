import { mailEnabled, sendMail } from "@/lib/mailer";
import { escapeHtml } from "@/lib/notify";

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
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4f4;font-family:Arial,sans-serif;color:#1c1c1c">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
<tr><td style="background:#a63240;color:#fff;padding:16px 24px;font-weight:bold;letter-spacing:.08em;font-size:13px">MINISTRIA E SHËNDETËSISË DHE MIRËQENIES SOCIALE</td></tr>
<tr><td style="padding:24px;line-height:1.55;font-size:14px">
<p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 14px;white-space:pre-line">${escapeHtml(opts.intro)}</p>
<p style="margin:0;white-space:pre-line">${escapeHtml(outro)}</p>
</td></tr>
<tr><td style="padding:12px 24px;font-size:11px;color:#888;border-top:1px solid #eee">Prania Besnike · MSHMS — ky email është dërguar nga sistemi i menaxhimit të kërkesave.</td></tr>
</table></td></tr></table></body></html>`;

  await sendMail({
    to: opts.to,
    subject: opts.subject,
    text,
    html,
    attachments: [{ filename: opts.filename, content: opts.pdf, contentType: "application/pdf" }],
  });
}

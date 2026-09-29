export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Shabllon i thjeshtë me tabela (Outlook/Gmail), me <head> të plotë dhe tekst
 * paraprak (preheader) — emailet pa to marrin pikë negative në filtrat anti-spam.
 */
export function renderEmail(opts: {
  title: string;
  band: string;
  preheader: string;
  bodyHtml: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="sq">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4f4;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #eeeeee">
<tr><td style="background:#a63240;color:#ffffff;padding:16px 24px;font-weight:bold;letter-spacing:.06em;font-size:13px;border-radius:12px 12px 0 0">${escapeHtml(opts.band)}</td></tr>
<tr><td style="padding:24px;line-height:1.55;font-size:14px">${opts.bodyHtml}</td></tr>
<tr><td style="padding:12px 24px;font-size:11px;line-height:1.5;color:#777777;border-top:1px solid #eeeeee">${escapeHtml(opts.footer)}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

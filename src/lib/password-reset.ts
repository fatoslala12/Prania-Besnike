import { createHash, randomBytes, randomInt } from "crypto";
import { escapeHtml, renderEmail } from "@/lib/email-template";
import { mailEnabled, sendMail } from "@/lib/mailer";
import { createPasswordResetToken } from "@/lib/repo";

export const RESET_HOURS_SELF = 1;
export const RESET_HOURS_ADMIN = 24;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Pa karaktere që ngatërrohen (0/O, 1/l/I), që të lexohet e diktohet lehtë. */
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function temporaryPassword() {
  const group = () =>
    Array.from({ length: 4 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/**
 * Lidhja duhet të funksionojë edhe kur domeni nuk është "i besuar" për njoftimet
 * (p.sh. lokalisht), sepse pa të emaili nuk ka kuptim.
 */
function appBase(req: Request) {
  return process.env.APP_URL || process.env.AUTH_URL || new URL(req.url).origin;
}

export async function sendPasswordResetEmail(
  req: Request,
  user: { id: string; name: string; email: string },
  opts: { byAdmin: boolean },
) {
  if (!mailEnabled()) throw new Error("MAIL_DISABLED");
  const token = randomBytes(32).toString("base64url");
  const hours = opts.byAdmin ? RESET_HOURS_ADMIN : RESET_HOURS_SELF;
  await createPasswordResetToken(user.id, hashResetToken(token), new Date(Date.now() + hours * 3_600_000));

  const url = new URL(`/hyr/rivendos?token=${token}`, appBase(req)).toString();
  const validity = hours === 1 ? "1 orë" : `${hours} orë`;
  const reason = opts.byAdmin
    ? "Administratori i Prania Besnike kërkoi rivendosjen e fjalëkalimit tuaj."
    : "Kemi marrë një kërkesë për rivendosjen e fjalëkalimit të llogarisë suaj në Prania Besnike.";
  const ignore = opts.byAdmin
    ? "Nëse nuk e prisnit këtë email, kontaktoni administratorin."
    : "Nëse nuk e keni kërkuar ju, injorojeni këtë email — fjalëkalimi juaj mbetet i pandryshuar.";
  const title = "Rivendosja e fjalëkalimit";
  const text =
    `Përshëndetje ${user.name},\n\n${reason}\n\nPër të vendosur një fjalëkalim të ri, hapni lidhjen më poshtë (e vlefshme për ${validity}, vetëm një herë):\n${url}\n\n${ignore}\n\n— Prania Besnike · MSHMS`;
  const html = renderEmail({
    title,
    band: "PRANIA BESNIKE · MSHMS",
    preheader: `Vendosni një fjalëkalim të ri. Lidhja vlen ${validity}.`,
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:18px;line-height:1.3">${escapeHtml(title)}</h1>
<p style="margin:0 0 14px">Përshëndetje ${escapeHtml(user.name)},</p>
<p style="margin:0 0 20px">${escapeHtml(reason)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#a63240;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Vendos fjalëkalimin e ri</a>
<p style="margin:20px 0 0;color:#555555;font-size:13px">Lidhja vlen ${escapeHtml(validity)} dhe përdoret vetëm një herë. ${escapeHtml(ignore)}</p>`,
    footer: "Email automatik nga Prania Besnike · MSHMS lidhur me llogarinë tuaj.",
  });
  await sendMail({ to: user.email, subject: `[Prania Besnike] ${title}`, text, html, automated: true });
}

/** Pas kaq kohe pa asnjë veprim (mi, tastierë, prekje, lëvizje faqeje) përdoruesi nxirret automatikisht. */
export const IDLE_TIMEOUT_MINUTES = 120;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60_000;
export const IDLE_TIMEOUT_LABEL =
  IDLE_TIMEOUT_MINUTES % 60 === 0 ? `${IDLE_TIMEOUT_MINUTES / 60} orësh` : `${IDLE_TIMEOUT_MINUTES} minutash`;

/** Paralajmërimi me numërim mbrapsht shfaqet kaq kohë para daljes. */
export const IDLE_WARNING_MS = 2 * 60_000;

/** Shfletuesi i thotë serverit "jam aktiv" jo më shpesh se kaq, dhe vetëm kur ka pasur veprim. */
export const IDLE_PING_MS = 5 * 60_000;

/**
 * Serveri pret pak më gjatë se shfletuesi: ping-u i fundit mund të ketë ardhur deri në
 * IDLE_PING_MS para veprimit të fundit, ndaj pa këtë rezervë serveri do e nxirrte para kohe.
 */
const SERVER_GRACE_MS = IDLE_PING_MS + 5 * 60_000;

/** Cookie jetëshkurtër që i tregon serverit se dalja ishte automatike (për regjistrin e aktivitetit). */
export const IDLE_LOGOUT_COOKIE = "pb_logout_reason";

export function isIdleExpired(lastSeen: unknown, now = Date.now()) {
  return typeof lastSeen === "number" && now - lastSeen > IDLE_TIMEOUT_MS + SERVER_GRACE_MS;
}

export function idleLoginUrl(path: string) {
  const back = path.startsWith("/") && !path.startsWith("//") ? path : "/panel";
  return `/hyr?arsye=pasivitet&callbackUrl=${encodeURIComponent(back)}`;
}

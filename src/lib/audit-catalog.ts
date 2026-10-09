/** IP-të dhe pajisjet janë të dhëna personale: mbahen vetëm për sigurinë, jo më shumë se kaq. */
export const AUDIT_RETENTION_DAYS = 180;

export type AuditModule = "AUTH" | "USERS" | "ORG_UNITS" | "TASKS" | "EMAIL";

export const AUDIT_MODULES: Record<AuditModule, string> = {
  AUTH: "Hyrjet & sesionet",
  USERS: "Përdoruesit",
  ORG_UNITS: "Drejtoritë",
  TASKS: "Kërkesat",
  EMAIL: "Email-et",
};

type ActionInfo = { label: string; module: AuditModule };

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: { label: "Hyrje e suksesshme", module: "AUTH" },
  LOGIN_FAILED: { label: "Hyrje e dështuar", module: "AUTH" },
  LOGOUT: { label: "Dalje", module: "AUTH" },
  SESSION_TIMEOUT: { label: "Doli automatikisht (pasivitet)", module: "AUTH" },
  ROLE_SWITCH: { label: "Ndërroi rolin", module: "AUTH" },
  PASSWORD_CHANGED: { label: "Ndryshoi fjalëkalimin", module: "AUTH" },
  PASSWORD_RESET_REQUESTED: { label: "Kërkoi rivendosje fjalëkalimi", module: "AUTH" },
  PASSWORD_RESET_DONE: { label: "Rivendosi fjalëkalimin me lidhje", module: "AUTH" },
  USER_CREATED: { label: "Krijoi përdorues", module: "USERS" },
  USER_UPDATED: { label: "Ndryshoi përdorues", module: "USERS" },
  USER_DEACTIVATED: { label: "Çaktivizoi përdorues", module: "USERS" },
  USER_ACTIVATED: { label: "Aktivizoi përdorues", module: "USERS" },
  USER_PASSWORD_RESET: { label: "Rivendosi fjalëkalimin e përdoruesit", module: "USERS" },
  USER_ROLE_ADDED: { label: "Shtoi rol", module: "USERS" },
  USER_ROLE_REMOVED: { label: "Hoqi rol", module: "USERS" },
  ORG_UNIT_CREATED: { label: "Shtoi drejtori", module: "ORG_UNITS" },
  ORG_UNIT_RENAMED: { label: "Riemërtoi drejtori", module: "ORG_UNITS" },
  ORG_UNIT_DEACTIVATED: { label: "Çaktivizoi drejtori", module: "ORG_UNITS" },
  ORG_UNIT_ACTIVATED: { label: "Aktivizoi drejtori", module: "ORG_UNITS" },
  TASK_CREATED: { label: "Krijoi kërkesë", module: "TASKS" },
  CITIZEN_REQUEST: { label: "Kërkesë nga qytetari", module: "TASKS" },
  TASK_DELETED: { label: "Fshiu kërkesë", module: "TASKS" },
  RESPONSE_SENT: { label: "Dërgoi përgjigje te qytetari", module: "TASKS" },
  DOCUMENT_SENT: { label: "Dërgoi dokument te qytetari", module: "TASKS" },
  REQUEST_PDF_SENT: { label: "Dërgoi kërkesën (PDF) te qytetari", module: "TASKS" },
  REPORT_EXPORTED: { label: "Eksportoi raport", module: "TASKS" },
  EMAIL_SENT: { label: "Email u dërgua", module: "EMAIL" },
  EMAIL_FAILED: { label: "Email dështoi", module: "EMAIL" },
} satisfies Record<string, ActionInfo>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const LOGIN_FAILURE_REASONS: Record<string, string> = {
  WRONG_PASSWORD: "Fjalëkalim i gabuar",
  UNKNOWN_USER: "Përdorues që nuk ekziston",
  INACTIVE: "Llogari e çaktivizuar",
  RATE_LIMITED: "Shumë tentativa — u bllokua përkohësisht",
  INVALID_INPUT: "Të dhëna të paplota",
};

export function actionLabel(action: string) {
  return (AUDIT_ACTIONS as Record<string, ActionInfo>)[action]?.label ?? action;
}

export function actionModule(action: string): AuditModule | null {
  return (AUDIT_ACTIONS as Record<string, ActionInfo>)[action]?.module ?? null;
}

export function reasonLabel(reason: string | null) {
  return reason ? (LOGIN_FAILURE_REASONS[reason] ?? reason) : null;
}

export type DeviceInfo = { os: string; browser: string; device: "mobile" | "tablet" | "desktop" | "bot" };

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua ?? "";
  if (!s) return { os: "E panjohur", browser: "I panjohur", device: "desktop" };
  if (/bot|crawl|spider|curl|wget|python|node-fetch|undici|axios|postman/i.test(s)) {
    return { os: "—", browser: "Skript / bot", device: "bot" };
  }

  let os = "E panjohur";
  let m: RegExpMatchArray | null;
  if ((m = s.match(/Windows NT (\d+\.\d+)/))) {
    os = ({ "10.0": "Windows 10/11", "6.3": "Windows 8.1", "6.2": "Windows 8", "6.1": "Windows 7" } as Record<string, string>)[m[1]] ?? "Windows";
  } else if ((m = s.match(/(?:iPhone|iPad|iPod).*?OS (\d+)/))) os = `iOS ${m[1]}`;
  else if ((m = s.match(/Android (\d+(?:\.\d+)?)/))) os = `Android ${m[1]}`;
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if ((m = s.match(/Mac OS X (\d+)[_.](\d+)/))) os = `macOS ${m[1]}.${m[2]}`;
  else if (/Linux/.test(s)) os = "Linux";

  const browsers: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
    [/OPR\/(\d+)/, "Opera"],
    [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
    [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
    [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
    [/Version\/(\d+).*Safari/, "Safari"],
  ];
  let browser = "I panjohur";
  for (const [re, name] of browsers) {
    if ((m = s.match(re))) {
      browser = `${name} ${m[1]}`;
      break;
    }
  }

  const device =
    /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s))
      ? "tablet"
      : /Mobi|iPhone|iPod|Android/.test(s)
        ? "mobile"
        : "desktop";
  return { os, browser, device };
}

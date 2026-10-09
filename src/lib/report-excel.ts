import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { STATUS_LABELS } from "@/lib/constants";
import { OVERDUE_DAYS, formatDuration, pct, type Report, type ReportFilter } from "@/lib/reports";
import type { TaskStatus } from "@/lib/types";

export const EXCEL_SHEETS = ["summary", "tasks", "units", "creators", "activity", "trend"] as const;
export type ExcelSheet = (typeof EXCEL_SHEETS)[number];

const C = {
  brand: "FFA63240",
  brandDark: "FF7F222E",
  brandSoft: "FFF8EEF0",
  ink: "FF111111",
  muted: "FF6B6B6B",
  line: "FFE6E2E1",
  zebra: "FFFAF8F7",
  white: "FFFFFFFF",
};

const STATUS_STYLE: Record<TaskStatus, { fill: string; font: string }> = {
  I_RI: { fill: "FFF8EEF0", font: "FFA63240" },
  NE_PROCES: { fill: "FFFEF3C7", font: "FF92400E" },
  PERFUNDUAR: { fill: "FFD1FAE5", font: "FF065F46" },
  BLOKUAR: { fill: "FFF4F4F5", font: "FF52525B" },
};

const FONT = "Calibri";
const FIRST_DATA_ROW = 5;
const thin = (argb: string): Partial<ExcelJS.Border> => ({ style: "thin", color: { argb } });
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const day = (iso: string) => format(new Date(`${iso}T00:00:00`), "dd.MM.yyyy");

/** ExcelJS i shkruan datat si UTC; kjo i mban orët siç i sheh përdoruesi (ora e Tiranës). */
function excelDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
}

export type ExcelMeta = {
  generatedBy: string;
  generatedAt: Date;
  creatorLabel: string | null;
};

function filterSummary(filter: ReportFilter, meta: ExcelMeta) {
  const parts = [`Periudha ${day(filter.from)} – ${day(filter.to)}`];
  if (filter.orgUnit) parts.push(filter.orgUnit === "none" ? "Pa delegim" : filter.orgUnit);
  if (filter.status) parts.push(STATUS_LABELS[filter.status]);
  if (filter.source) parts.push(filter.source === "citizen" ? "Nga qytetarët" : "Të brendshme");
  if (meta.creatorLabel) parts.push(`Gjeneruar nga: ${meta.creatorLabel}`);
  return parts.join(" · ");
}

function generatedLine(meta: ExcelMeta) {
  return `Gjeneruar më ${format(meta.generatedAt, "dd.MM.yyyy HH:mm")} nga ${meta.generatedBy}`;
}

function setupPrint(ws: ExcelJS.Worksheet, titleRows?: string) {
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
    ...(titleRows ? { printTitlesRow: titleRows } : {}),
  };
  ws.headerFooter = {
    oddFooter: "&L&8Prania Besnike · MSHMS&C&8&A&R&8Faqja &P nga &N",
  };
}

type Column = {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
  numFmt?: string;
  wrap?: boolean;
  total?: "sum" | "count" | { value: string | number };
  bar?: boolean;
};

type Cell = string | number | Date | null;

function tableSheet(
  wb: ExcelJS.Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: Column[],
  rows: Cell[][],
  opts: { statusCol?: number; statuses?: TaskStatus[]; emptyText: string },
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: FIRST_DATA_ROW - 1, showGridLines: false }],
    properties: { tabColor: { argb: C.brand } },
  });
  const last = columns.length;
  ws.columns = columns.map((c) => ({ width: c.width }));

  ws.mergeCells(1, 1, 1, last);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: FONT, size: 16, bold: true, color: { argb: C.white } };
  t.fill = fill(C.brand);
  t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, last);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { name: FONT, size: 10, italic: true, color: { argb: C.brandDark } };
  s.fill = fill(C.brandSoft);
  s.alignment = { vertical: "middle", indent: 1, wrapText: true };
  const width = columns.reduce((acc, c) => acc + c.width, 0);
  ws.getRow(2).height = Math.max(20, Math.ceil((subtitle.length * 1.15) / width) * 14 + 6);
  ws.getRow(3).height = 8;

  const header = ws.getRow(FIRST_DATA_ROW - 1);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    cell.fill = fill(C.brandDark);
    // Shigjeta e filtrit zë anën e djathtë të qelizës.
    cell.alignment = {
      vertical: "middle",
      horizontal: c.align ?? "left",
      indent: c.align === "right" ? 2 : 0,
      wrapText: true,
    };
    cell.border = { right: thin(C.brand) };
  });
  header.height = 34;

  rows.forEach((values, r) => {
    const row = ws.getRow(FIRST_DATA_ROW + r);
    values.forEach((v, i) => {
      const col = columns[i];
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = { name: FONT, size: 10, color: { argb: C.ink } };
      cell.alignment = { vertical: "middle", horizontal: col.align ?? "left", wrapText: col.wrap ?? false };
      if (col.numFmt) cell.numFmt = col.numFmt;
      cell.border = { bottom: thin(C.line) };
      if (r % 2 === 1) cell.fill = fill(C.zebra);
    });
    if (opts.statusCol !== undefined && opts.statuses) {
      const st = STATUS_STYLE[opts.statuses[r]];
      const cell = row.getCell(opts.statusCol + 1);
      cell.fill = fill(st.fill);
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: st.font } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  const lastDataRow = FIRST_DATA_ROW + Math.max(rows.length, 1) - 1;
  if (rows.length === 0) {
    ws.mergeCells(FIRST_DATA_ROW, 1, FIRST_DATA_ROW, last);
    const e = ws.getCell(FIRST_DATA_ROW, 1);
    e.value = opts.emptyText;
    e.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } };
    e.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(FIRST_DATA_ROW).height = 28;
  } else {
    ws.autoFilter = { from: { row: FIRST_DATA_ROW - 1, column: 1 }, to: { row: FIRST_DATA_ROW - 1, column: last } };
    columns.forEach((c, i) => {
      if (!c.bar) return;
      const letter = ws.getColumn(i + 1).letter;
      ws.addConditionalFormatting({
        ref: `${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow}`,
        rules: [
          {
            type: "dataBar",
            priority: 1,
            gradient: false,
            cfvo: [{ type: "num", value: 0 }, { type: "max" }],
            color: { argb: "FFE8B4BB" },
          } as unknown as ExcelJS.ConditionalFormattingRule,
        ],
      });
    });
  }

  if (rows.length > 0 && columns.some((c) => c.total)) {
    const row = ws.getRow(lastDataRow + 1);
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const letter = ws.getColumn(i + 1).letter;
      const range = `${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow}`;
      if (i === 0) {
        cell.value =
          c.total === "count"
            ? { formula: `"Gjithsej: "&SUBTOTAL(103,${range})`, result: `Gjithsej: ${rows.length}` }
            : "Gjithsej";
      } else if (c.total === "sum") {
        const result = rows.reduce((acc, r) => acc + (typeof r[i] === "number" ? (r[i] as number) : 0), 0);
        cell.value = { formula: `SUBTOTAL(109,${range})`, result };
      } else if (c.total === "count") {
        cell.value = { formula: `SUBTOTAL(103,${range})`, result: rows.length };
      } else if (c.total) {
        cell.value = c.total.value;
      }
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.brandDark } };
      cell.fill = fill(C.brandSoft);
      cell.border = { top: { style: "medium", color: { argb: C.brand } } };
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : (c.align ?? "left") };
      if (c.numFmt) cell.numFmt = c.numFmt;
    });
    row.height = 22;
  }

  setupPrint(ws, `${FIRST_DATA_ROW - 1}:${FIRST_DATA_ROW - 1}`);
  return ws;
}

async function summarySheet(wb: ExcelJS.Workbook, report: Report, filter: ReportFilter, meta: ExcelMeta) {
  const ws = wb.addWorksheet("Përmbledhje", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: C.brandDark } },
  });
  ws.columns = Array.from({ length: 6 }, () => ({ width: 21 }));
  const t = report.totals;

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "mshms-logo.png"));
    const id = wb.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: "png" });
    ws.addImage(id, { tl: { col: 0.15, row: 0.2 }, ext: { width: 112, height: 84 } });
  } catch {
    // Pa logo raporti mbetet i plotë.
  }

  const text = (row: number, value: string, font: Partial<ExcelJS.Font>, height?: number) => {
    ws.mergeCells(row, 2, row, 6);
    const cell = ws.getCell(row, 2);
    cell.value = value;
    cell.font = { name: FONT, ...font };
    cell.alignment = { vertical: "middle", indent: 1 };
    if (height) ws.getRow(row).height = height;
  };
  text(1, "Raport i kërkesave", { size: 22, bold: true, color: { argb: C.brand } }, 34);
  text(2, "Prania Besnike · Ministria e Shëndetësisë dhe Mbrojtjes Sociale", { size: 11, bold: true, color: { argb: C.ink } }, 18);
  text(3, filterSummary(filter, meta), { size: 10, color: { argb: C.muted } }, 16);
  text(4, generatedLine(meta), { size: 9, italic: true, color: { argb: C.muted } }, 16);
  ws.getRow(5).height = 10;
  for (let c = 1; c <= 6; c++) ws.getCell(5, c).border = { bottom: { style: "thick", color: { argb: C.brand } } };
  ws.getRow(6).height = 12;

  const kpis: [string, string | number, string][] = [
    ["Kërkesa gjithsej", t.total, `${t.citizen} nga qytetarët · ${t.internal} të brendshme`],
    ["Të hapura", t.open, `${t.byStatus.I_RI} të reja · ${t.byStatus.NE_PROCES} në proces`],
    ["Përfunduar", t.byStatus.PERFUNDUAR, `${t.completionRate}% shkalla e zgjidhjes`],
    ["Bllokuar", t.byStatus.BLOKUAR, `${pct(t.byStatus.BLOKUAR, t.total)}% e totalit`],
    ["Koha mesatare e zgjidhjes", formatDuration(t.avgResolutionHours), `Mediana: ${formatDuration(t.medianResolutionHours)}`],
    [`Të vonuara (>${OVERDUE_DAYS} ditë)`, t.overdue, `${t.unassigned} pa delegim`],
  ];
  kpis.forEach(([label, value, sub], i) => {
    const first = 7 + Math.floor(i / 3) * 4;
    const col = 1 + (i % 3) * 2;
    const rows: [number, string | number, Partial<ExcelJS.Font>, number][] = [
      [first, label.toUpperCase(), { size: 8, bold: true, color: { argb: C.muted } }, 18],
      [first + 1, value, { size: 22, bold: true, color: { argb: i === 5 && t.overdue ? C.brand : C.ink } }, 32],
      [first + 2, sub, { size: 9, color: { argb: C.muted } }, 18],
    ];
    for (const [r, v, font, h] of rows) {
      ws.mergeCells(r, col, r, col + 1);
      const cell = ws.getCell(r, col);
      cell.value = v;
      cell.font = { name: FONT, ...font };
      cell.fill = fill(r === first ? C.brandSoft : C.white);
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(r).height = h;
      for (const c of [col, col + 1]) {
        ws.getCell(r, c).border = {
          left: c === col ? { style: "thick", color: { argb: C.brand } } : undefined,
          right: c === col + 1 ? thin(C.line) : undefined,
          top: r === first ? thin(C.line) : undefined,
          bottom: r === first + 2 ? thin(C.line) : undefined,
        };
      }
    }
  });

  const section = (row: number, col: number, span: number, title: string) => {
    ws.mergeCells(row, col, row, col + span - 1);
    const cell = ws.getCell(row, col);
    cell.value = title;
    cell.font = { name: FONT, size: 12, bold: true, color: { argb: C.brand } };
    for (let c = col; c < col + span; c++) ws.getCell(row, c).border = { bottom: { style: "medium", color: { argb: C.brand } } };
    ws.getRow(row).height = 22;
  };
  const headerCells = (row: number, col: number, labels: string[]) => {
    labels.forEach((l, i) => {
      const cell = ws.getCell(row, col + i);
      cell.value = l;
      cell.font = { name: FONT, size: 9, bold: true, color: { argb: C.white } };
      cell.fill = fill(C.brandDark);
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    });
    ws.getRow(row).height = 20;
  };
  const dataCell = (row: number, col: number, value: Cell, opts: { numFmt?: string; bold?: boolean; align?: "left" | "right" } = {}) => {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = { name: FONT, size: 10, bold: opts.bold ?? false, color: { argb: C.ink } };
    cell.alignment = { vertical: "middle", horizontal: opts.align ?? "right", indent: opts.align === "left" ? 1 : 0, wrapText: true };
    cell.border = { bottom: thin(C.line) };
    if (opts.numFmt) cell.numFmt = opts.numFmt;
  };

  section(15, 1, 3, "Sipas statusit");
  headerCells(16, 1, ["Statusi", "Numri", "% e totalit"]);
  report.statuses.forEach((s, i) => {
    const r = 17 + i;
    dataCell(r, 1, STATUS_LABELS[s], { align: "left", bold: true });
    const st = STATUS_STYLE[s];
    ws.getCell(r, 1).fill = fill(st.fill);
    ws.getCell(r, 1).font = { name: FONT, size: 10, bold: true, color: { argb: st.font } };
    dataCell(r, 2, t.byStatus[s], { bold: true });
    dataCell(r, 3, t.total ? t.byStatus[s] / t.total : 0, { numFmt: "0%" });
    ws.getRow(r).height = 20;
  });

  section(15, 4, 3, "Sipas burimit");
  headerCells(16, 4, ["Burimi", "Numri", "% e totalit"]);
  const sources: [string, number][] = [
    ["Nga qytetarët", t.citizen],
    ["Të brendshme (stafi)", t.internal],
    ["Pa delegim ende", t.unassigned],
  ];
  sources.forEach(([label, n], i) => {
    dataCell(17 + i, 4, label, { align: "left" });
    dataCell(17 + i, 5, n, { bold: true });
    dataCell(17 + i, 6, t.total ? n / t.total : 0, { numFmt: "0%" });
    ws.getRow(17 + i).height = 20;
  });

  const top = report.byUnit.slice(0, 8);
  section(22, 1, 6, "Drejtoritë / agjencitë me më shumë kërkesa");
  headerCells(23, 1, ["Njësia", "", "", "Totali", "% zgjidhje", "Koha mesatare"]);
  ws.mergeCells(23, 1, 23, 3);
  if (top.length === 0) {
    ws.mergeCells(24, 1, 24, 6);
    dataCell(24, 1, "Nuk ka të dhëna për këtë periudhë.", { align: "left" });
  }
  top.forEach((u, i) => {
    const r = 24 + i;
    ws.mergeCells(r, 1, r, 3);
    dataCell(r, 1, u.name, { align: "left" });
    dataCell(r, 4, u.total, { bold: true });
    dataCell(r, 5, u.completionRate / 100, { numFmt: "0%" });
    dataCell(r, 6, formatDuration(u.avgResolutionHours));
    ws.getRow(r).height = u.name.length > 60 ? 30 : 20;
  });
  if (top.length) {
    ws.addConditionalFormatting({
      ref: `D24:D${23 + top.length}`,
      rules: [
        {
          type: "dataBar",
          priority: 1,
          gradient: false,
          cfvo: [{ type: "num", value: 0 }, { type: "max" }],
          color: { argb: "FFE8B4BB" },
        } as unknown as ExcelJS.ConditionalFormattingRule,
      ],
    });
  }

  const note = 25 + Math.max(top.length, 1);
  ws.mergeCells(note, 1, note, 6);
  const n = ws.getCell(note, 1);
  n.value =
    `Shënim: "Të vonuara" janë kërkesat ende të hapura më shumë se ${OVERDUE_DAYS} ditë. ` +
    "Detajet e plota janë në fletët e tjera të këtij skedari.";
  n.font = { name: FONT, size: 9, italic: true, color: { argb: C.muted } };
  n.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(note).height = 28;

  setupPrint(ws);
  ws.pageSetup.orientation = "portrait";
}

export async function reportWorkbook(report: Report, filter: ReportFilter, meta: ExcelMeta, active: ExcelSheet) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Prania Besnike";
  wb.title = "Raport i kërkesave";
  wb.created = meta.generatedAt;
  wb.calcProperties.fullCalcOnLoad = true;

  const sub = `${filterSummary(filter, meta)} · ${generatedLine(meta)}`;

  await summarySheet(wb, report, filter, meta);

  tableSheet(
    wb,
    "Kërkesat",
    `Lista e kërkesave (${report.tasks.length})`,
    sub,
    [
      { header: "ID", width: 14, total: "count" },
      { header: "Data e krijimit", width: 17, numFmt: "dd.mm.yyyy hh:mm", align: "center" },
      { header: "Titulli", width: 44, wrap: true },
      { header: "Drejtoria / Agjencia", width: 38, wrap: true },
      { header: "Statusi", width: 14, align: "center" },
      { header: "Burimi", width: 13 },
      { header: "Qytetari", width: 22, wrap: true },
      { header: "Telefoni", width: 15 },
      { header: "Email", width: 26 },
      { header: "Gjeneruar nga", width: 22, wrap: true },
      { header: "Përfunduar më", width: 17, numFmt: "dd.mm.yyyy hh:mm", align: "center" },
      { header: "Koha e zgjidhjes", width: 16, align: "right" },
      { header: "Komente", width: 12, align: "center", total: "sum" },
      { header: "Dokumente", width: 13, align: "center", total: "sum" },
    ],
    report.tasks.map((task) => [
      task.number,
      excelDate(task.createdAt),
      task.title.replace(/\s+/g, " ").trim(),
      task.orgUnit ?? "Pa delegim",
      STATUS_LABELS[task.status],
      task.isCitizenRequest ? "Qytetar" : "I brendshëm",
      task.citizenName || "",
      task.citizenPhone || "",
      task.citizenEmail || "",
      task.creatorId ? task.creatorName || "—" : "Formular publik",
      excelDate(task.completedAt),
      formatDuration(report.resolutionHours(task)),
      task.commentsCount,
      task.documentsCount,
    ]),
    { statusCol: 4, statuses: report.tasks.map((x) => x.status), emptyText: "Nuk ka kërkesa për këto filtra." },
  );

  tableSheet(
    wb,
    "Sipas drejtorisë",
    "Kërkesat sipas drejtorisë / agjencisë",
    sub,
    [
      { header: "Drejtoria / Agjencia", width: 46, wrap: true },
      { header: "Totali", width: 11, align: "right", total: "sum", bar: true },
      ...report.statuses.map((s): Column => ({ header: STATUS_LABELS[s], width: 13, align: "right", total: "sum" })),
      { header: "Nga qytetarët", width: 15, align: "right", total: "sum" },
      { header: `Të vonuara (>${OVERDUE_DAYS} ditë)`, width: 16, align: "right", total: "sum" },
      { header: "% zgjidhje", width: 13, align: "right", numFmt: "0%", total: { value: report.totals.completionRate / 100 } },
      { header: "Koha mesatare", width: 16, align: "right", total: { value: formatDuration(report.totals.avgResolutionHours) } },
    ],
    report.byUnit.map((u) => [
      u.name,
      u.total,
      ...report.statuses.map((s) => u.byStatus[s]),
      u.citizen,
      u.overdue,
      u.completionRate / 100,
      formatDuration(u.avgResolutionHours),
    ]),
    { emptyText: "Nuk ka të dhëna për këtë periudhë." },
  );

  tableSheet(
    wb,
    "Sipas personit",
    "Kërkesat sipas personit që i regjistroi",
    sub,
    [
      { header: "Gjeneruar nga", width: 34, wrap: true },
      { header: "Totali", width: 11, align: "right", total: "sum", bar: true },
      { header: "Përfunduar", width: 14, align: "right", total: "sum" },
      { header: "Të hapura", width: 13, align: "right", total: "sum" },
      { header: "% e totalit", width: 14, align: "right", numFmt: "0%" },
    ],
    report.byCreator.map((c) => [c.name, c.total, c.completed, c.open, c.share / 100]),
    { emptyText: "Nuk ka të dhëna." },
  );

  tableSheet(
    wb,
    "Aktiviteti",
    "Aktiviteti i përdoruesve në periudhë",
    sub,
    [
      { header: "Përdoruesi", width: 30, wrap: true },
      { header: "Krijime", width: 11, align: "right", total: "sum" },
      { header: "Ndryshime statusi", width: 14, align: "right", total: "sum" },
      { header: "Ri-delegime", width: 14, align: "right", total: "sum" },
      { header: "Komente", width: 12, align: "right", total: "sum" },
      { header: "Dokumente", width: 13, align: "right", total: "sum" },
      { header: "Përgjigje zyrtare", width: 14, align: "right", total: "sum" },
      { header: "Totali", width: 11, align: "right", total: "sum", bar: true },
    ],
    report.activity.map((a) => [a.name, a.created, a.status, a.redelegated, a.comments, a.documents, a.responses, a.total]),
    { emptyText: "Nuk ka aktivitet në këtë periudhë." },
  );

  tableSheet(
    wb,
    "Trendi",
    report.trend.monthly ? "Trendi mujor" : "Trendi ditor",
    sub,
    [
      { header: report.trend.monthly ? "Muaji" : "Data", width: 16, align: "center" },
      { header: "Krijuar", width: 14, align: "right", total: "sum", bar: true },
      { header: "Përfunduar", width: 15, align: "right", total: "sum", bar: true },
    ],
    report.trend.buckets.map((b) => [
      report.trend.monthly ? b.label : format(new Date(`${b.key}T00:00:00`), "dd.MM.yyyy"),
      b.created,
      b.completed,
    ]),
    { emptyText: "Nuk ka të dhëna." },
  );

  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: EXCEL_SHEETS.indexOf(active), visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

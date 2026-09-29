import { readFile } from "fs/promises";
import path from "path";
import { format } from "date-fns";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import type { ResponseView, TaskRecord } from "@/lib/types";

const A4: [number, number] = [595.28, 841.89];
const MARGIN_X = 62;
const TOP = A4[1] - 34;
const BOTTOM = 70;
const CONTENT_W = A4[0] - MARGIN_X * 2;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.8, 0.8, 0.8);

const MINISTRY = "MINISTRIA E SHËNDETËSISË DHE MIRËQENIES SOCIALE";
const REPUBLIC = "REPUBLIKA E SHQIPËRISË";

/** Emblema është prerë nga koka zyrtare; vija horizontale e kokës kalon në rreshtin 58.5/70 të saj. */
const EMBLEM = { file: "emblem-mshms.png", width: 44, srcW: 60, srcH: 70, lineRow: 58.5 };

let emblemBytes: Promise<Buffer> | null = null;
function loadEmblem() {
  emblemBytes ??= readFile(path.join(process.cwd(), "public", EMBLEM.file));
  return emblemBytes;
}

const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** Fontet standarde të PDF-së njohin vetëm WinAnsi; shqipja (ë, ç) përfshihet. */
function clean(s: string) {
  let out = "";
  for (const ch of s.replace(/\r\n?/g, "\n").replace(/\t/g, "    ")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch)) {
      out += ch;
    } else if (ch === "→") out += "->";
    else if (c < 0x20 || (c >= 0x7f && c < 0xa0)) continue;
    else out += "?";
  }
  return out;
}

const fmtDate = (iso: string) => format(new Date(iso), "dd.MM.yyyy");
const fmtDateTime = (iso: string) => format(new Date(iso), "dd.MM.yyyy HH:mm");

type Line = { text: string; endOfParagraph: boolean };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): Line[] {
  const lines: Line[] = [];
  for (const para of clean(text).split("\n")) {
    const words = para.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: "", endOfParagraph: true });
      continue;
    }
    let current = "";
    for (let word of words) {
      while (font.widthOfTextAtSize(word, size) > maxWidth) {
        if (current) {
          lines.push({ text: current, endOfParagraph: false });
          current = "";
        }
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
        lines.push({ text: word.slice(0, cut), endOfParagraph: false });
        word = word.slice(cut);
      }
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
      else {
        lines.push({ text: current, endOfParagraph: false });
        current = word;
      }
    }
    lines.push({ text: current, endOfParagraph: true });
  }
  return lines;
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; sans: PDFFont };

class Writer {
  page!: PDFPage;
  y = TOP;

  private constructor(
    readonly doc: PDFDocument,
    readonly fonts: Fonts,
    private readonly emblem: PDFImage,
    private readonly continuationLabel: string,
  ) {}

  static async create(title: string, continuationLabel: string) {
    const doc = await PDFDocument.create();
    doc.setTitle(clean(title));
    doc.setAuthor("Ministria e Shëndetësisë dhe Mirëqenies Sociale");
    doc.setCreator("Prania Besnike · MSHMS");
    doc.setProducer("Prania Besnike");
    doc.setLanguage("sq-AL");
    const [regular, bold, italic, sans, emblem] = await Promise.all([
      doc.embedFont(StandardFonts.TimesRoman),
      doc.embedFont(StandardFonts.TimesRomanBold),
      doc.embedFont(StandardFonts.TimesRomanItalic),
      doc.embedFont(StandardFonts.HelveticaBold),
      loadEmblem().then((b) => doc.embedPng(b)),
    ]);
    const w = new Writer(doc, { regular, bold, italic, sans }, emblem, continuationLabel);
    w.page = doc.addPage(A4);
    w.letterhead();
    return w;
  }

  private letterhead() {
    const k = EMBLEM.width / EMBLEM.srcW;
    const h = EMBLEM.srcH * k;
    const lineY = TOP - EMBLEM.lineRow * k;
    this.page.drawLine({
      start: { x: MARGIN_X - 12, y: lineY },
      end: { x: A4[0] - MARGIN_X + 12, y: lineY },
      thickness: 0.8,
      color: INK,
    });
    this.page.drawImage(this.emblem, {
      x: (A4[0] - EMBLEM.width) / 2,
      y: TOP - h,
      width: EMBLEM.width,
      height: h,
    });
    let y = TOP - h - 9;
    this.spaced(REPUBLIC, this.fonts.sans, 6.8, 2.1, y);
    y -= 15;
    this.centered(MINISTRY, this.fonts.bold, 12.5, y);
    this.y = y - 30;
  }

  private spaced(text: string, font: PDFFont, size: number, spacing: number, y: number) {
    const chars = [...clean(text)];
    const width =
      chars.reduce((s, c) => s + font.widthOfTextAtSize(c, size), 0) + spacing * (chars.length - 1);
    let x = (A4[0] - width) / 2;
    for (const c of chars) {
      this.page.drawText(c, { x, y, size, font, color: INK });
      x += font.widthOfTextAtSize(c, size) + spacing;
    }
  }

  centered(text: string, font: PDFFont, size: number, y = this.y, color = INK) {
    const t = clean(text);
    this.page.drawText(t, { x: (A4[0] - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  }

  text(text: string, x: number, font: PDFFont, size: number, color = INK, y = this.y) {
    this.page.drawText(clean(text), { x, y, size, font, color });
  }

  rightText(text: string, right: number, font: PDFFont, size: number, color = INK, y = this.y) {
    const t = clean(text);
    this.page.drawText(t, { x: right - font.widthOfTextAtSize(t, size), y, size, font, color });
  }

  ensure(height: number) {
    if (this.y - height >= BOTTOM) return;
    this.page = this.doc.addPage(A4);
    this.y = TOP - 4;
    this.text(this.continuationLabel, MARGIN_X, this.fonts.italic, 9, MUTED);
    this.y -= 26;
  }

  rule(color = RULE, thickness = 0.6) {
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: A4[0] - MARGIN_X, y: this.y },
      thickness,
      color,
    });
  }

  /** Paragrafë me rreshta të justifikuar (përveç rreshtit të fundit të paragrafit). */
  paragraphs(
    body: string,
    opts: { font?: PDFFont; size?: number; leading?: number; x?: number; width?: number; justify?: boolean } = {},
  ) {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 11.5;
    const leading = opts.leading ?? size * 1.45;
    const x = opts.x ?? MARGIN_X;
    const width = opts.width ?? CONTENT_W;
    for (const line of wrap(body, font, size, width)) {
      this.ensure(leading);
      const words = line.text.split(" ");
      if (opts.justify && !line.endOfParagraph && words.length > 1) {
        const wordsW = words.reduce((s, w) => s + font.widthOfTextAtSize(w, size), 0);
        const gap = (width - wordsW) / (words.length - 1);
        let cx = x;
        for (const w of words) {
          this.page.drawText(w, { x: cx, y: this.y, size, font, color: INK });
          cx += font.widthOfTextAtSize(w, size) + gap;
        }
      } else if (line.text) {
        this.page.drawText(line.text, { x, y: this.y, size, font, color: INK });
      }
      this.y -= leading;
    }
  }

  /** Rreshti poshtë kokës: majtas numri, djathtas data. */
  numberAndDate(number: string, date: string) {
    this.text(`Nr. ${number}`, MARGIN_X, this.fonts.bold, 11.5);
    this.rightText(date, A4[0] - MARGIN_X, this.fonts.regular, 11.5);
    this.y -= 30;
  }

  async finish(footer: string) {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const t = clean(`${footer} · Faqe ${i + 1}/${pages.length}`);
      const size = 8;
      const w = this.fonts.regular.widthOfTextAtSize(t, size);
      p.drawLine({
        start: { x: MARGIN_X, y: 46 },
        end: { x: A4[0] - MARGIN_X, y: 46 },
        thickness: 0.4,
        color: RULE,
      });
      p.drawText(t, { x: (A4[0] - w) / 2, y: 34, size, font: this.fonts.regular, color: MUTED });
    });
    return Buffer.from(await this.doc.save());
  }
}

export async function requestPdf(task: TaskRecord): Promise<Buffer> {
  const w = await Writer.create(`Kërkesa ${task.number}`, `Kërkesa Nr. ${task.number} (vazhdim)`);
  const { bold, regular, italic } = w.fonts;

  w.centered("FLETË REGJISTRIMI I KËRKESËS", bold, 13.5);
  w.y -= 30;
  w.numberAndDate(task.number, `Data: ${fmtDate(task.createdAt)}`);

  const rows: [string, string | null][] = [
    ["Emri dhe mbiemri", task.citizenName],
    ["Telefoni", task.citizenPhone],
    ["Email", task.citizenEmail],
    ["Data e kërkesës", fmtDate(task.requestDate ?? task.createdAt)],
    ["Regjistruar më", fmtDateTime(task.createdAt)],
    ["Burimi", task.isCitizenRequest ? "Formulari online i qytetarit" : "Regjistruar nga stafi i Ministrisë"],
    ["Drejtoria / Agjencia", task.orgUnit ?? "Në pritje të delegimit"],
    ["Lënda", task.isCitizenRequest ? null : task.title],
  ];
  const labelW = 138;
  const size = 11;
  const leading = 15;
  w.rule();
  w.y -= 17;
  for (const [label, value] of rows) {
    if (!value) continue;
    const lines = wrap(value, regular, size, CONTENT_W - labelW);
    w.ensure(lines.length * leading + 10);
    w.text(`${label}:`, MARGIN_X, bold, size);
    for (const l of lines) {
      w.text(l.text, MARGIN_X + labelW, regular, size);
      w.y -= leading;
    }
    w.y += leading - 8;
    w.rule();
    w.y -= 17;
  }

  w.y -= 8;
  w.ensure(40);
  w.text("Përshkrimi i kërkesës", MARGIN_X, bold, 12);
  w.y -= 20;
  w.paragraphs(task.description, { size: 11.5, justify: true });

  w.y -= 18;
  w.ensure(50);
  w.paragraphs(
    `Kjo fletë vërteton regjistrimin e kërkesës në sistemin «Prania Besnike» të Ministrisë së Shëndetësisë dhe Mirëqenies Sociale. Ruajeni numrin ${task.number} për çdo komunikim të mëtejshëm lidhur me këtë kërkesë.`,
    { font: italic, size: 9.5, leading: 13 },
  );

  return w.finish(`Prania Besnike · MSHMS · Kërkesa Nr. ${task.number}`);
}

/** Data e shkresës: kur u dërgua; para dërgimit, versioni i fundit i draftit. */
export function responseDate(response: Pick<ResponseView, "sentAt" | "updatedAt">) {
  return fmtDate(response.sentAt ?? response.updatedAt);
}

export async function responsePdf(task: TaskRecord, response: ResponseView): Promise<Buffer> {
  const w = await Writer.create(
    `Përgjigje ${response.number}`,
    `Përgjigje Nr. ${response.number} (vazhdim)`,
  );
  const { bold, regular } = w.fonts;

  for (const line of wrap(response.orgUnit.toLocaleUpperCase("sq"), bold, 12, CONTENT_W)) {
    w.centered(line.text, bold, 12);
    w.y -= 16;
  }
  w.y -= 18;
  w.numberAndDate(response.number, `Tiranë, më ${responseDate(response)}`);

  const size = 11.5;
  const labelled = (label: string, value: string) => {
    const labelW = bold.widthOfTextAtSize(`${label} `, size);
    const lines = wrap(value, regular, size, CONTENT_W - labelW);
    w.ensure(lines.length * 16);
    w.text(label, MARGIN_X, bold, size);
    for (const l of lines) {
      w.text(l.text, MARGIN_X + labelW, regular, size);
      w.y -= 16;
    }
  };
  if (task.citizenName) labelled("Drejtuar:", task.citizenName);
  labelled(
    "Lënda:",
    `Përgjigje për kërkesën Nr. ${task.number}, datë ${fmtDate(task.requestDate ?? task.createdAt)}`,
  );
  w.y -= 18;

  w.paragraphs(response.content, { size, justify: true });

  const colW = 210;
  const colCenter = A4[0] - MARGIN_X - colW / 2;
  const unitLines = wrap(response.orgUnit.toLocaleUpperCase("sq"), bold, size, colW);
  w.y -= 30;
  w.ensure(unitLines.length * 15 + 44);
  for (const l of unitLines) {
    w.text(l.text, colCenter - bold.widthOfTextAtSize(l.text, size) / 2, bold, size);
    w.y -= 15;
  }
  w.y -= 26;
  w.page.drawLine({
    start: { x: colCenter - 80, y: w.y },
    end: { x: colCenter + 80, y: w.y },
    thickness: 0.6,
    color: INK,
  });

  return w.finish(`Prania Besnike · MSHMS · Përgjigje Nr. ${response.number}`);
}

export function pdfResponse(bytes: Buffer, filename: string, inline: boolean) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

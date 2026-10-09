import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditActor, recordAudit } from "@/lib/audit";
import { canViewReports } from "@/lib/constants";
import { EXCEL_SHEETS, reportWorkbook, type ExcelSheet } from "@/lib/report-excel";
import { PUBLIC_CREATOR, buildReport, filterRange, parseReportFilter } from "@/lib/reports";
import { getReportData, listOrgUnits } from "@/lib/repo";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  if (!canViewReports(session.user)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const filter = parseReportFilter(sp, (await listOrgUnits()).map((o) => o.name));
  const sheet: ExcelSheet = (EXCEL_SHEETS as readonly string[]).includes(sp.sheet) ? (sp.sheet as ExcelSheet) : "summary";
  const report = buildReport(await getReportData(filterRange(filter)), filter);
  const creatorLabel = !filter.creatorId
    ? null
    : filter.creatorId === PUBLIC_CREATOR
      ? "Formular publik (qytetarë)"
      : (report.byCreator[0]?.name ?? "—");

  const body = await reportWorkbook(
    report,
    filter,
    { generatedBy: session.user.name, generatedAt: new Date(), creatorLabel },
    sheet,
  );
  await recordAudit("REPORT_EXPORTED", {
    ...auditActor(session),
    targetLabel: `Excel · ${sheet}`,
    details: `${filter.from} – ${filter.to}${filter.orgUnit ? ` · ${filter.orgUnit}` : ""}`,
  });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Raport-Prania-Besnike_${filter.from}_${filter.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditActor, recordAudit } from "@/lib/audit";
import { canViewReports } from "@/lib/constants";
import { buildReport, filterRange, parseReportFilter, reportCsv } from "@/lib/reports";
import { getReportData, listOrgUnits } from "@/lib/repo";

const TYPES = new Set(["tasks", "units", "creators", "activity"]);

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
  const type = TYPES.has(sp.type) ? sp.type : "tasks";
  const report = buildReport(await getReportData(filterRange(filter)), filter);
  await recordAudit("REPORT_EXPORTED", {
    ...auditActor(session),
    targetLabel: `CSV · ${type}`,
    details: `${filter.from} – ${filter.to}${filter.orgUnit ? ` · ${filter.orgUnit}` : ""}`,
  });

  return new NextResponse(reportCsv(report, type), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raport-${type}-${filter.from}_${filter.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

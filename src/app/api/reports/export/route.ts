import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewReports } from "@/lib/constants";
import { buildReport, filterRange, parseReportFilter, reportCsv } from "@/lib/reports";
import { getReportData } from "@/lib/repo";

const TYPES = new Set(["tasks", "units", "creators", "activity"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  if (!canViewReports(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const filter = parseReportFilter(sp);
  const type = TYPES.has(sp.type) ? sp.type : "tasks";
  const report = buildReport(await getReportData(filterRange(filter)), filter);

  return new NextResponse(reportCsv(report, type), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raport-${type}-${filter.from}_${filter.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

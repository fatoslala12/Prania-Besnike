import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewActivity } from "@/lib/constants";
import { FETCH_LIMIT, auditCsv, matchesActivity, parseActivityFilter, periodRange } from "@/lib/activity";
import { listAuditLogs } from "@/lib/repo";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Pa autorizim" }, { status: 401 });
  }
  if (!canViewActivity(session.user.role)) {
    return NextResponse.json({ error: "Nuk keni të drejtë" }, { status: 403 });
  }

  const f = parseActivityFilter(Object.fromEntries(new URL(req.url).searchParams));
  const rows = (await listAuditLogs(periodRange(f), FETCH_LIMIT)).filter((l) => matchesActivity(l, f));

  return new NextResponse(auditCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aktiviteti-${f.from}_${f.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

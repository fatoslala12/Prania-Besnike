import { NextResponse } from "next/server";
import { pdfResponse, requestPdf } from "@/lib/pdf";
import { verifyPdfToken } from "@/lib/pdf-token";
import { getTask } from "@/lib/repo";

export async function GET(req: Request) {
  const taskId = verifyPdfToken(new URL(req.url).searchParams.get("t"));
  if (!taskId) {
    return NextResponse.json(
      { error: "Lidhja ka skaduar ose nuk është e vlefshme" },
      { status: 403 },
    );
  }
  const task = await getTask(taskId);
  if (!task) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  return pdfResponse(await requestPdf(task), `${task.number}.pdf`, false);
}

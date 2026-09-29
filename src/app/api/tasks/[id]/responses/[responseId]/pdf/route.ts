import { NextResponse } from "next/server";
import { pdfResponse, responsePdf } from "@/lib/pdf";
import { getResponse } from "@/lib/repo";
import { loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string; responseId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id, responseId } = await params;
  const loaded = await loadAccessibleTask(id);
  if (loaded.error) return loaded.error;
  const response = await getResponse(id, responseId);
  if (!response) return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return pdfResponse(await responsePdf(loaded.task, response), `${response.number}.pdf`, inline);
}

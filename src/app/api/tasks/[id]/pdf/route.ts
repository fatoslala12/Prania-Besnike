import { pdfResponse, requestPdf } from "@/lib/pdf";
import { loadAccessibleTask } from "@/lib/task-route";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const loaded = await loadAccessibleTask((await params).id);
  if (loaded.error) return loaded.error;
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return pdfResponse(await requestPdf(loaded.task), `${loaded.task.number}.pdf`, inline);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifyTaskChange } from "@/lib/notify";
import { createPdfToken } from "@/lib/pdf-token";
import { createTask, isActiveOrgUnit } from "@/lib/repo";

const MIN_FILL_MS = 3000;

const schema = z.object({
  citizenName: z.string().trim().min(2).max(120),
  citizenEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  citizenPhone: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[+\d\s()-]+$/),
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orgUnit: z.string().min(1).max(200),
  description: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
  website: z.string().nullish(),
  startedAt: z.number().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const hourly = rateLimit(`citizen:h:${ip}`, 5, 10 * 60_000);
  const daily = rateLimit(`citizen:d:${ip}`, 20, 24 * 60 * 60_000);
  if (!hourly.ok || !daily.ok) {
    return NextResponse.json(
      { error: "Keni dërguar shumë kërkesa. Provoni përsëri më vonë." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(hourly.retryAfterSec, daily.retryAfterSec)) },
      },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ju lutem plotësoni të gjitha fushat e detyrueshme." },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const tooFast = !data.startedAt || Date.now() - data.startedAt < MIN_FILL_MS;
    if (data.website || tooFast) {
      return NextResponse.json({ ok: true });
    }
    if (!(await isActiveOrgUnit(data.orgUnit))) {
      return NextResponse.json(
        { error: "Drejtoria e zgjedhur nuk është më e disponueshme. Rifreskoni faqen dhe zgjidhni sërish." },
        { status: 400 },
      );
    }

    const actor = { id: null, name: "Qytetar (formular publik)" };
    const task = await createTask(
      {
        title: `Kërkesë qytetari: ${data.citizenName}`,
        description: data.description,
        orgUnit: data.orgUnit,
        citizenName: data.citizenName,
        citizenEmail: data.citizenEmail || null,
        citizenPhone: data.citizenPhone,
        requestDate: new Date(`${data.requestDate}T12:00:00Z`).toISOString(),
        isCitizenRequest: true,
        creatorId: null,
        assigneeId: null,
      },
      actor,
    );
    await notifyTaskChange({ kind: "TASK_NEW", task }, actor);
    return NextResponse.json({ ok: true, number: task.number, pdfToken: createPdfToken(task.id) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gabim në server. Provoni përsëri." },
      { status: 500 },
    );
  }
}

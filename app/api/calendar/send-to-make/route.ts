import { NextRequest, NextResponse } from "next/server";
import { buildCalendarImageUrl } from "@/lib/calendar-share";
import { getWeeklyCalendarSnapshot } from "@/lib/weekly-calendar";
import { verifyWebhookSignature } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function defaultCaption(snapshot: Awaited<ReturnType<typeof getWeeklyCalendarSnapshot>>) {
  const who = snapshot.staffName ? ` · ${snapshot.staffName}` : "";
  return [
    `📅 Agenda semanal${who}`,
    `${snapshot.salonName}`,
    `Semana ${snapshot.weekStart} → ${snapshot.weekEnd}`,
    `🟩 Libres: ${snapshot.summary.free}`,
    `🟨 Parciales: ${snapshot.summary.partial}`,
    `🟥 Ocupados: ${snapshot.summary.busy}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-signature");
    const ok = verifyWebhookSignature(raw, sig, secret);
    if (!ok) {
      return jsonError("Invalid signature", 401);
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const salonId = payload?.salonId as string | undefined;
  const weekStart = payload?.weekStart as string | undefined;
  const staffId = payload?.staffId as string | undefined;
  const phone = payload?.phone as string | undefined;
  const caption = payload?.caption as string | undefined;
  const dryRun = Boolean(payload?.dryRun);

  if (!salonId || !weekStart) {
    return jsonError("salonId y weekStart son obligatorios", 400);
  }

  const makeWebhookUrl =
    (payload?.makeWebhookUrl as string | undefined) ||
    process.env.MAKE_WEEKLY_CALENDAR_WEBHOOK_URL;

  if (!makeWebhookUrl && !dryRun) {
    return jsonError("Falta MAKE_WEEKLY_CALENDAR_WEBHOOK_URL", 500);
  }

  const snapshot = await getWeeklyCalendarSnapshot({
    salonId,
    weekStart,
    staffId,
  });

  const imageUrl = buildCalendarImageUrl({
    salonId,
    weekStart,
    staffId,
    expiresInMinutes: 120,
  });

  const finalCaption = caption || defaultCaption(snapshot);

  const makePayload = {
    type: "weekly_calendar_whatsapp",
    phone,
    caption: finalCaption,
    imageUrl,
    salonId,
    weekStart,
    weekEnd: snapshot.weekEnd,
    staffId: staffId || null,
    staffName: snapshot.staffName || null,
    salonName: snapshot.salonName,
    summary: snapshot.summary,
  };

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      makePayload,
    });
  }

  const makeResponse = await fetch(makeWebhookUrl!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(makePayload),
    cache: "no-store",
  });

  const text = await makeResponse.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // si Make devuelve texto plano, lo dejamos tal cual
  }

  if (!makeResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        forwarded: false,
        status: makeResponse.status,
        imageUrl,
        makePayload,
        makeResponse: parsed,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    forwarded: true,
    status: makeResponse.status,
    imageUrl,
    makePayload,
    makeResponse: parsed,
  });
}
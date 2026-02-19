import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const item = await prisma.appointment.findFirst({
    where: { id: params.id, salonId },
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      service: { select: { id: true, name: true, durationMin: true, bufferMin: true, priceCents: true } },
      staff: { select: { id: true, name: true } },
      cancellation: true,
    },
  });

  if (!item) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  const existing = await prisma.appointment.findFirst({ where: { id: params.id, salonId } });
  if (!existing) return jsonError("Not found", 404);


  const allowed = {
    status: body?.status,
    startAt: body?.startAt,
    endAt: body?.endAt,
    staffId: body?.staffId,
    serviceId: body?.serviceId,
    notes: body?.notes,
  } as Record<string, unknown>;

  // Minimal validation (MVP). Harden later.
  const data: any = {};
  if (typeof allowed.status === "string") data.status = allowed.status;
  if (typeof allowed.staffId === "string") data.staffId = allowed.staffId;
  if (typeof allowed.serviceId === "string") data.serviceId = allowed.serviceId;
  if (typeof allowed.notes === "string") data.notes = allowed.notes;
  if (typeof allowed.startAt === "string") data.startAt = new Date(allowed.startAt);
  if (typeof allowed.endAt === "string") data.endAt = new Date(allowed.endAt);

  const updated = await prisma.appointment.update({
    where: { id },
    data,
  }).catch(() => null);

  if (!updated) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true, item: updated });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  service: { select: { id: true, name: true, durationMin: true, bufferMin: true, priceCents: true } },
  staff: { select: { id: true, name: true } },
  cancellation: true,
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
    select: {
      id: true,
      status: true,
      amountCents: true,
      currency: true,
      providerCheckoutUrl: true,
      paidAt: true,
      createdAt: true,
    },
  },
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  const staffId = (session!.user as any).staffId ?? null;
  const { id } = await ctx.params;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const item = await prisma.appointment.findFirst({
    where: {
      id,
      salonId,
      ...(role === "STAFF" ? { staffId } : {}),
    },
    include: appointmentInclude,
  });

  if (!item) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;

  const role = (session!.user as any).role;
  if (role === "STAFF") return jsonError("FORBIDDEN", 403);

  const salonId = (session!.user as any).salonId;
  const { id } = await ctx.params;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const body = await req.json().catch(() => null);
  const existing = await prisma.appointment.findFirst({ where: { id, salonId } });
  if (!existing) return jsonError("Not found", 404);

  const allowed = {
    status: body?.status,
    startAt: body?.startAt,
    endAt: body?.endAt,
    staffId: body?.staffId,
    serviceId: body?.serviceId,
    notes: body?.notes,
  } as Record<string, unknown>;

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
    include: appointmentInclude,
  }).catch(() => null);

  if (!updated) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true, item: updated });
}

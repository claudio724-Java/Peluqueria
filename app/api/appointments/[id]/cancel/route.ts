import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { AppointmentCancelSchema } from "@/lib/validators/appointments";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const { id } = await ctx.params;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const body = await req.json().catch(() => ({}));
  const parsed = AppointmentCancelSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

  const appt = await prisma.appointment.findFirst({
    where: { id, salonId },
    include: {
      salon: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
    },
  });
  if (!appt) return jsonError("Not found", 404);

  if (appt.status === "CANCELED") {
    return NextResponse.json({ ok: true, item: appt, waitlistCandidates: [] });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "CANCELED",
      cancellation: {
        create: { reason: parsed.data.reason || null },
      },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
      cancellation: true,
    },
  });

  const waitlist = await prisma.waitlistEntry.findMany({
    where: {
      salonId: appt.salonId,
      isActive: true,
      OR: [{ serviceId: null }, { serviceId: appt.serviceId }],
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  const waitlistCandidates = waitlist.map((w) => ({
    waitlistEntryId: w.id,
    customerId: w.customer.id,
    name: w.customer.name,
    phone: w.customer.phone,
    note: w.note,
  }));

  return NextResponse.json({ ok: true, item: updated, waitlistCandidates });
}

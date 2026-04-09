import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { AppointmentCreateSchema } from "@/lib/validators/appointments";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, bufferMin: true, priceCents: true } },
  staff: { select: { id: true, name: true } },
  cancellation: true,
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      status: true,
      amountCents: true,
      currency: true,
      providerCheckoutUrl: true,
      paidAt: true,
    },
  },
};

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { searchParams } = new URL(req.url);
  const salonId = (session!.user as any).salonId ?? searchParams.get("salonId");
  const role = (session!.user as any).role;
  const staffId = (session!.user as any).staffId ?? null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const where: any = { salonId };
  if (role === "STAFF") {
    if (!staffId) return jsonError("staffId missing on user/session", 400);
    where.staffId = staffId;
  }
  if (from || to) {
    where.startAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const items = await prisma.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: appointmentInclude,
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const role = (session!.user as any).role;
  if (role === "STAFF") return jsonError("FORBIDDEN", 403);

  const body = await req.json().catch(() => null);
  const parsed = AppointmentCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

  const { serviceId, staffId, customer, startAt, endAt, notes } = parsed.data;
  const salonId = (session!.user as any).salonId;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const service = await prisma.service.findFirst({ where: { id: serviceId, salonId, isActive: true } });
  if (!service) return jsonError("Service not found", 404);

  const start = new Date(startAt);
  const computedEnd = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + (service.durationMin + (service.bufferMin ?? 0)) * 60 * 1000);

  if (!(computedEnd > start)) return jsonError("endAt must be after startAt");

  const existingCustomer = await prisma.customer.findFirst({ where: { salonId, phone: customer.phone } });
  const customerRow = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: customer.name,
          email: customer.email || null,
          notes: customer.notes || null,
          consent: customer.consent ?? true,
        },
      })
    : await prisma.customer.create({
        data: {
          salonId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || null,
          notes: customer.notes || null,
          consent: customer.consent ?? true,
        },
      });

  const staff = await prisma.staff.findFirst({ where: { id: staffId, salonId, isActive: true } });
  if (!staff) return jsonError("Staff not found", 404);

  const conflict = await prisma.appointment.findFirst({
    where: {
      salonId,
      staffId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: computedEnd },
      endAt: { gt: start },
    },
    select: { id: true },
  });

  if (conflict) return jsonError("Time slot not available", 409, { conflictId: conflict.id });

  const created = await prisma.appointment.create({
    data: {
      salonId,
      serviceId,
      staffId,
      customerId: customerRow.id,
      startAt: start,
      endAt: computedEnd,
      status: "CONFIRMED",
      notes: notes || null,
    },
    include: appointmentInclude,
  });

  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}

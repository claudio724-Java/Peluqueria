import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook";
import { getAvailability } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

/**
 * Webhook pensado para Make:
 * - POST JSON
 * - Header: X-Signature: sha256=<hex>
 * - Secret: WEBHOOK_SECRET (env)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const raw = await req.text();

  if (secret) {
    const sig = req.headers.get("x-signature");
    const ok = verifyWebhookSignature(raw, sig, secret);
    if (!ok) return jsonError("Invalid signature", 401);
  }

  const payload = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  if (!payload || typeof payload !== "object") return jsonError("Invalid JSON", 400);

  const intent = (payload as any).intent as string | undefined;
  if (!intent) return jsonError("Missing intent", 400);

  // ---- intent: check_availability ----
  if (intent === "check_availability") {
    const salonId = (payload as any).salonId;
    const serviceId = (payload as any).serviceId;
    const staffId = (payload as any).staffId;
    const date = (payload as any).date; // YYYY-MM-DD
    if (!salonId || !serviceId || !date) return jsonError("salonId, serviceId and date are required", 400);

    const slots = await getAvailability({ salonId, serviceId, staffId, date });
    return NextResponse.json({ ok: true, intent, slots });
  }

  // ---- intent: create_appointment ----
  if (intent === "create_appointment") {
    const { salonId, serviceId, staffId, startAt, customer } = payload as any;
    if (!salonId || !serviceId || !staffId || !startAt || !customer?.name || !customer?.phone) {
      return jsonError("Missing fields for create_appointment", 400);
    }

    const service = await prisma.service.findFirst({ where: { id: serviceId, salonId, isActive: true } });
    if (!service) return jsonError("Service not found", 404);

    const start = new Date(startAt);
    const end = new Date(start.getTime() + (service.durationMin + (service.bufferMin ?? 0)) * 60 * 1000);

    const staff = await prisma.staff.findFirst({ where: { id: staffId, salonId, isActive: true } });
    if (!staff) return jsonError("Staff not found", 404);

    const conflict = await prisma.appointment.findFirst({
      where: {
        salonId,
        staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: { id: true },
    });
    if (conflict) return jsonError("Time slot not available", 409, { conflictId: conflict.id });

    const existingCustomer = await prisma.customer.findFirst({ where: { salonId, phone: customer.phone } });
    const customerRow = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: customer.name,
            email: customer.email || null,
            consent: customer.consent ?? true,
          },
        })
      : await prisma.customer.create({
          data: {
            salonId,
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
            consent: customer.consent ?? true,
          },
        });

    const created = await prisma.appointment.create({
      data: {
        salonId,
        serviceId,
        staffId,
        customerId: customerRow.id,
        startAt: start,
        endAt: end,
        status: "CONFIRMED",
        notes: (payload as any).notes || null,
      },
    });

    return NextResponse.json({ ok: true, intent, appointmentId: created.id });
  }

  // ---- intent: cancel_appointment ----
  if (intent === "cancel_appointment") {
    const appointmentId = (payload as any).appointmentId;
    const reason = (payload as any).reason;
    if (!appointmentId) return jsonError("appointmentId is required", 400);

    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) return jsonError("Not found", 404);

    if (appt.status !== "CANCELED") {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELED",
          cancellation: { create: { reason: reason || null } },
        },
      });
    }

    return NextResponse.json({ ok: true, intent, appointmentId });
  }

  return jsonError(`Unknown intent: ${intent}`, 400);
}

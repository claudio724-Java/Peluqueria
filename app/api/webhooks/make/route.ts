import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook";
import { getAvailability } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { createPaymentLink } from "@/lib/payments/service";
import { buildSalonDataPayload } from "@/lib/salon-data-webhook";
import { DateTime } from "luxon";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function paymentMessage(url: string, amountCents: number, currency: string) {
  const amount = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

  return `Aquí tienes tu enlace de pago: ${url}\nImporte: ${amount}`;
}

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

  if (intent === "check_availability") {
    try {
      const salonId = (payload as any).salonId;
      const serviceId = (payload as any).serviceId;
      const staffId = (payload as any).staffId;
      const date = (payload as any).date;

      if (!salonId || !serviceId || !date) {
        return jsonError("salonId, serviceId and date are required", 400);
      }

      const slots = await getAvailability({ salonId, serviceId, staffId, date });

      if (!Array.isArray(slots)) {
        return jsonError("getAvailability did not return an array", 500, { slots });
      }

      const cleanSlots = slots.map((s: string) =>
        String(s).replace("Z", "").substring(0, 19)
      );

      return NextResponse.json({ ok: true, intent, slots: cleanSlots });
    } catch (error) {
      console.error("check_availability error:", error);

      return jsonError(
        error instanceof Error ? error.message : "Internal error in check_availability",
        500,
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error
      );
    }
  }

  if (intent === "create_appointment") {
    const { salonId, serviceId, staffId, customer } = payload as any;

    if (!salonId || !serviceId || !staffId || !customer?.name || !customer?.phone) {
      return jsonError("Missing fields for create_appointment", 400);
    }

    const zone = (payload as any).timeZone || "Atlantic/Canary";

    const dt = DateTime.fromISO(
      `${(payload as any).appointmentDate}T${(payload as any).appointmentTime}`,
      { zone }
    );

    if (!dt.isValid) {
      return jsonError("Invalid date/time format", 400);
    }

    const start = new Date(dt.toUTC().toISO()!);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, isActive: true },
    });
    if (!service) return jsonError("Service not found", 404);

    const end = new Date(
      start.getTime() + (service.durationMin + (service.bufferMin ?? 0)) * 60 * 1000
    );

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, salonId, isActive: true },
    });
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

    if (conflict) {
      return jsonError("Time slot not available", 409, {
        conflictId: conflict.id,
      });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { salonId, phone: customer.phone },
    });

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

    return NextResponse.json({
      ok: true,
      intent,
      appointmentId: created.id,
    });
  }

  if (intent === "cancel_appointment") {
    const appointmentId = (payload as any).appointmentId;
    const reason = (payload as any).reason;

    if (!appointmentId) return jsonError("appointmentId is required", 400);

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

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

  if (intent === "create_payment_link") {
    try {
      const payment = await createPaymentLink({
        salonId: (payload as any).salonId,
        appointmentId: (payload as any).appointmentId,
        amountCents: (payload as any).amountCents,
        currency: (payload as any).currency,
        description: (payload as any).description,
        customerName: (payload as any).customerName,
        customerPhone: (payload as any).customerPhone,
        customerEmail: (payload as any).customerEmail,
        metadata: {
          source: "make_whatsapp",
          conversationId: (payload as any).conversationId,
        },
      });

      if (!payment.providerCheckoutUrl) {
        return jsonError("Stripe no devolvió URL de checkout", 502);
      }

      return NextResponse.json({
        ok: true,
        intent,
        paymentId: payment.id,
        url: payment.providerCheckoutUrl,
        whatsappText: paymentMessage(
          payment.providerCheckoutUrl,
          payment.amountCents,
          payment.currency
        ),
      });
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Payment error",
        400
      );
    }
  }

  if (intent === "get_salon_data") {
    const salonId = (payload as any).salonId;

    if (!salonId) return jsonError("salonId is required", 400);

    const salonPayload = await buildSalonDataPayload(salonId);
    if (!salonPayload) return jsonError("Salon not found", 404);

    return NextResponse.json(salonPayload);
  }

  return jsonError(`Unknown intent: ${intent}`, 400);
}
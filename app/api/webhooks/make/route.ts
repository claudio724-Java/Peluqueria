import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook";
import { getAvailability } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { createPaymentLink } from "@/lib/payments/service";

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

/**
 * Webhook pensado para Make:
 * - POST JSON
 * - Header opcional: X-Signature: sha256=<hex>
 * - Secret: WEBHOOK_SECRET
 *
 * Intents soportados:
 * - check_availability
 * - create_appointment
 * - cancel_appointment
 * - create_payment_link
 * - get_payment_status
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

  if (intent === "check_availability") {
    const salonId = (payload as any).salonId;
    const serviceId = (payload as any).serviceId;
    const staffId = (payload as any).staffId;
    const date = (payload as any).date;
    if (!salonId || !serviceId || !date) return jsonError("salonId, serviceId and date are required", 400);

    const slots = await getAvailability({ salonId, serviceId, staffId, date });
    return NextResponse.json({ ok: true, intent, slots });
  }

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

  if (intent === "create_payment_link") {
    const salonId = (payload as any).salonId as string | undefined;
    const appointmentId = (payload as any).appointmentId as string | undefined;
    const amountCents = (payload as any).amountCents as number | undefined;
    const currency = (payload as any).currency as string | undefined;
    const customerName = (payload as any).customerName as string | undefined;
    const customerPhone = (payload as any).customerPhone as string | undefined;
    const customerEmail = (payload as any).customerEmail as string | undefined;
    const description = (payload as any).description as string | undefined;

    if (!salonId) return jsonError("salonId is required", 400);
    if (!appointmentId && !amountCents) {
      return jsonError("appointmentId or amountCents is required", 400);
    }

    try {
      const payment = await createPaymentLink({
        salonId,
        appointmentId,
        amountCents,
        currency,
        description,
        customerName,
        customerPhone,
        customerEmail,
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
        appointmentId: payment.appointmentId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        url: payment.providerCheckoutUrl,
        whatsappText: paymentMessage(payment.providerCheckoutUrl, payment.amountCents, payment.currency),
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "No se pudo crear el enlace de pago", 400);
    }
  }

  if (intent === "get_payment_status") {
    const paymentId = (payload as any).paymentId as string | undefined;
    const appointmentId = (payload as any).appointmentId as string | undefined;
    const salonId = (payload as any).salonId as string | undefined;

    if (!paymentId && !(appointmentId && salonId)) {
      return jsonError("paymentId or (appointmentId + salonId) is required", 400);
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : await prisma.payment.findFirst({
          where: { appointmentId, salonId },
          orderBy: { createdAt: "desc" },
        });

    if (!payment) return jsonError("Payment not found", 404);

    return NextResponse.json({
      ok: true,
      intent,
      paymentId: payment.id,
      status: payment.status,
      paidAt: payment.paidAt,
      url: payment.providerCheckoutUrl,
      amountCents: payment.amountCents,
      currency: payment.currency,
    });
  }
  // ... otros intents arriba

  if (intent === "get_payment_status") {
    const paymentId = (payload as any).paymentId as string | undefined;
    const appointmentId = (payload as any).appointmentId as string | undefined;
    const salonId = (payload as any).salonId as string | undefined;

    if (!paymentId && !(appointmentId && salonId)) {
      return jsonError("paymentId or (appointmentId + salonId) is required", 400);
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : await prisma.payment.findFirst({
          where: { appointmentId, salonId },
          orderBy: { createdAt: "desc" },
        });

    if (!payment) return jsonError("Payment not found", 404);

    return NextResponse.json({
      ok: true,
      intent,
      paymentId: payment.id,
      status: payment.status,
      paidAt: payment.paidAt,
      url: payment.providerCheckoutUrl,
      amountCents: payment.amountCents,
      currency: payment.currency,
    });
  }

  if (intent === "get_salon_data") {
    const salonId = (payload as any).salonId as string | undefined;

    if (!salonId) {
      return jsonError("salonId is required", 400);
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        staff: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!salon) {
      return jsonError("Salon not found", 404);
    }

    return NextResponse.json({
      ok: true,
      intent,
      salon: {
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        phone: salon.phone,
        timezone: salon.timezone,
        createdAt: salon.createdAt,
        updatedAt: salon.updatedAt,
      },
      trabajadores: salon.staff.map((staff) => ({
        id: staff.id,
        salonId: staff.salonId,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })),
      servicios: salon.services.map((service) => ({
        id: service.id,
        salonId: service.salonId,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        bufferMin: service.bufferMin,
        isActive: service.isActive,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      })),
    });
  }

  return jsonError(`Unknown intent: ${intent}`, 400);
}

  return jsonError(`Unknown intent: ${intent}`, 400);
}

import { prisma } from "@/lib/prisma";

export async function buildSalonDataPayload(salonId: string) {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      businessHours: {
        orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }],
      },
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

  if (!salon) return null;

  const hasStripeSecretKey = Boolean(salon.stripeSecretKeyEncrypted);
  const hasStripeWebhookSecret = Boolean(salon.stripeWebhookSecretEncrypted);
  const hasEnvStripeWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  return {
    ok: true,
    intent: "get_salon_data",
    salon: {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
      currency: salon.currency,
      timezone: salon.timezone,
      slotIntervalMin: salon.slotIntervalMin,
      stripeEnabled: Boolean(salon.stripeEnabled),
      hasStripeSecretKey,
      hasStripeWebhookSecret,
      hasEnvStripeWebhookSecret,
      canUseStripePaymentLinks:
        Boolean(salon.stripeEnabled) &&
        hasStripeSecretKey &&
        (hasStripeWebhookSecret || hasEnvStripeWebhookSecret),
      stripeMode:
        hasStripeWebhookSecret && hasEnvStripeWebhookSecret
          ? "mixed"
          : hasStripeWebhookSecret
            ? "salon"
            : hasEnvStripeWebhookSecret
              ? "env"
              : "none",
      notifications: {
        appointmentReminder: Boolean(salon.notifyAppointmentReminder),
        bookingConfirmation: Boolean(salon.notifyBookingConfirmation),
        cancellation: Boolean(salon.notifyCancellation),
        dailySummary: Boolean(salon.notifyDailySummary),
      },
      createdAt: salon.createdAt,
      updatedAt: salon.updatedAt,
    },
    horarios: salon.businessHours.map((item) => ({
      id: item.id,
      salonId: item.salonId,
      dayOfWeek: item.dayOfWeek,
      shift: item.shift,
      isOpen: item.isOpen,
      startMin: item.startMin,
      endMin: item.endMin,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    trabajadores: salon.staff.map((staff) => ({
      id: staff.id,
      salonId: staff.salonId,
      name: staff.name,
      email: staff.email,
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
  };
}

export async function sendSalonDataWebhook(salonId: string) {
  const webhookUrl = process.env.MAKE_SALON_DATA_WEBHOOK_URL;
  const payload = await buildSalonDataPayload(salonId);

  if (!payload) {
    return { delivered: false, skipped: true, reason: "Salon not found" };
  }

  if (!webhookUrl) {
    return { delivered: false, skipped: true, reason: "MAKE_SALON_DATA_WEBHOOK_URL not configured", payload };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // noop
  }

  return {
    delivered: response.ok,
    skipped: false,
    status: response.status,
    payload,
    response: parsed,
  };
}

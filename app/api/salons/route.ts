import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { encryptText } from "@/lib/crypto";
import { sendSalonDataWebhook } from "@/lib/salon-data-webhook";

type BusinessHourInput = {
  dayOfWeek: number;
  shift: "MORNING" | "AFTERNOON";
  isOpen: boolean;
  startMin: number | null;
  endMin: number | null;
};

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;

  if (!salonId) {
    return Response.json({ ok: false, error: "salonId missing on user" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      businessHours: {
        orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }],
      },
    },
  });

  if (!salon) {
    return Response.json({ ok: true, items: [] });
  }

  return Response.json({
    ok: true,
    items: [
      {
        ...salon,
        hasStripeWebhookSecret: Boolean(salon.stripeWebhookSecretEncrypted),
        hasStripeSecretKey: Boolean(salon.stripeSecretKeyEncrypted),
        stripeWebhookSecretEncrypted: undefined,
        stripeSecretKeyEncrypted: undefined,
      },
    ],
  });
}

export async function PATCH(req: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;

  if (role === "STAFF") {
    return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  if (!salonId) {
    return Response.json({ ok: false, error: "salonId missing on user" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  if (!body?.name || !body?.slug || !body?.timezone) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const existingBySlug = await prisma.salon.findFirst({
    where: {
      slug: String(body.slug),
      NOT: { id: salonId },
    },
    select: { id: true },
  });

  if (existingBySlug) {
    return Response.json(
      { ok: false, error: "Slug already in use" },
      { status: 409 }
    );
  }

  const businessHours: BusinessHourInput[] = Array.isArray(body.businessHours)
    ? body.businessHours
    : [];

  const stripeWebhookSecret =
    typeof body.stripeWebhookSecret === "string" ? body.stripeWebhookSecret.trim() : undefined;

  const stripeSecretKey =
    typeof body.stripeSecretKey === "string" ? body.stripeSecretKey.trim() : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.salon.update({
      where: { id: salonId },
      data: {
        name: String(body.name).trim(),
        slug: String(body.slug).trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        currency: body.currency ? String(body.currency).trim() : "EUR",
        timezone: String(body.timezone).trim(),
        slotIntervalMin: body.slotIntervalMin ? Number(body.slotIntervalMin) : 30,
        stripeEnabled: Boolean(body.stripeEnabled),
        notifyAppointmentReminder: body.notifyAppointmentReminder ?? true,
        notifyBookingConfirmation: body.notifyBookingConfirmation ?? true,
        notifyCancellation: body.notifyCancellation ?? true,
        notifyDailySummary: body.notifyDailySummary ?? false,
        ...(stripeWebhookSecret !== undefined
          ? {
              stripeWebhookSecretEncrypted: stripeWebhookSecret
                ? encryptText(stripeWebhookSecret)
                : null,
            }
          : {}),
        ...(stripeSecretKey !== undefined
          ? {
              stripeSecretKeyEncrypted: stripeSecretKey
                ? encryptText(stripeSecretKey)
                : null,
            }
          : {}),
      },
    });

    for (const item of businessHours) {
      await tx.salonBusinessHour.upsert({
        where: {
          salonId_dayOfWeek_shift: {
            salonId,
            dayOfWeek: Number(item.dayOfWeek),
            shift: item.shift,
          },
        },
        update: {
          isOpen: Boolean(item.isOpen),
          startMin: item.isOpen ? item.startMin : null,
          endMin: item.isOpen ? item.endMin : null,
        },
        create: {
          salonId,
          dayOfWeek: Number(item.dayOfWeek),
          shift: item.shift,
          isOpen: Boolean(item.isOpen),
          startMin: item.isOpen ? item.startMin : null,
          endMin: item.isOpen ? item.endMin : null,
        },
      });
    }

    return tx.salon.findUnique({
      where: { id: salonId },
      include: {
        businessHours: {
          orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }],
        },
      },
    });
  });

  const webhookResult = await sendSalonDataWebhook(salonId).catch((error) => ({
    delivered: false,
    skipped: false,
    reason: error instanceof Error ? error.message : "Webhook delivery failed",
  }));

  return Response.json({
    ok: true,
    item: updated
      ? {
          ...updated,
          hasStripeWebhookSecret: Boolean(updated.stripeWebhookSecretEncrypted),
          hasStripeSecretKey: Boolean(updated.stripeSecretKeyEncrypted),
          stripeWebhookSecretEncrypted: undefined,
          stripeSecretKeyEncrypted: undefined,
        }
      : null,
    webhook: webhookResult,
  });
}

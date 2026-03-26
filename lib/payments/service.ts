import { prisma } from "@/lib/prisma";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { decryptText } from "@/lib/crypto";

type CreatePaymentLinkInput = {
  salonId: string;
  appointmentId?: string;
  amountCents?: number;
  currency?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
};

function appBaseUrl() {
  const raw = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!raw) throw new Error("APP_URL o NEXTAUTH_URL es obligatorio para generar enlaces de pago");
  return raw.replace(/\/$/, "");
}

function paymentUrls(paymentId: string) {
  const base = appBaseUrl();
  return {
    successUrl: `${base}/pago/exito?paymentId=${encodeURIComponent(paymentId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/pago/cancelado?paymentId=${encodeURIComponent(paymentId)}`,
  };
}

export async function createPaymentLink(input: CreatePaymentLinkInput) {
  const salon = await prisma.salon.findUnique({
    where: { id: input.salonId },
    select: {
      id: true,
      currency: true,
      stripeEnabled: true,
      stripeSecretKeyEncrypted: true,
    },
  });

  if (!salon) {
    throw new Error("Salón no encontrado");
  }

  if (!salon.stripeEnabled) {
    throw new Error("Stripe no está habilitado en este salón");
  }

  if (!salon.stripeSecretKeyEncrypted) {
    throw new Error("Stripe no está configurado en este salón");
  }

  const stripeSecretKey = decryptText(salon.stripeSecretKeyEncrypted);

  const appointment = input.appointmentId
    ? await prisma.appointment.findFirst({
        where: { id: input.appointmentId, salonId: input.salonId },
        include: {
          customer: true,
          service: true,
        },
      })
    : null;

  if (input.appointmentId && !appointment) {
    throw new Error("La cita indicada no existe en este salón");
  }

  const amountCents = input.amountCents ?? appointment?.service.priceCents ?? 0;
  if (!amountCents || amountCents <= 0) {
    throw new Error("No se puede generar el pago porque el importe es 0");
  }

  const currency = (input.currency || salon.currency || "EUR").toUpperCase();
  const customerName = input.customerName || appointment?.customer.name || undefined;
  const customerPhone = input.customerPhone || appointment?.customer.phone || undefined;
  const customerEmail = input.customerEmail || appointment?.customer.email || undefined;
  const description =
    input.description ||
    (appointment
      ? `Pago de cita · ${appointment.service.name} · ${appointment.customer.name}`
      : "Pago de servicio");

  const payment = await prisma.payment.create({
    data: {
      salonId: input.salonId,
      appointmentId: appointment?.id,
      amountCents,
      currency,
      description,
      customerName,
      customerPhone,
      customerEmail,
      metadata: (input.metadata as any) ?? undefined,
    },
  });

  try {
    const { successUrl, cancelUrl } = paymentUrls(payment.id);

    const session = await createStripeCheckoutSession({
      amountCents,
      currency,
      description,
      successUrl,
      cancelUrl,
      stripeSecretKey,
      customerEmail,
      metadata: {
        paymentId: payment.id,
        appointmentId: appointment?.id,
        salonId: input.salonId,
      },
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "STRIPE",
        providerPaymentId: session.id,
        providerCheckoutUrl: session.url,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
      },
    });

    return updated;
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        metadata: {
          ...(typeof input.metadata === "object" && input.metadata ? input.metadata : {}),
          error: error instanceof Error ? error.message : "No se pudo crear la sesión de Stripe",
        } as any,
      },
    });
    throw error;
  }
}

export async function syncPaymentStatusFromCheckoutSession(session: any) {
  const paymentId = session?.metadata?.paymentId as string | undefined;
  const providerPaymentId = session?.id as string | undefined;

  const payment = paymentId
    ? await prisma.payment.findUnique({ where: { id: paymentId } })
    : providerPaymentId
      ? await prisma.payment.findFirst({ where: { providerPaymentId } })
      : null;

  if (!payment) return null;

  let status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELED" = payment.status as any;
  let paidAt: Date | null = payment.paidAt;

  if (session.payment_status === "paid") {
    status = "PAID";
    paidAt = new Date();
  } else if (session.status === "expired") {
    status = "EXPIRED";
  } else if (session.status === "complete" && session.payment_status !== "paid") {
    status = "PENDING";
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      paidAt,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : payment.expiresAt,
      providerPaymentId,
      providerCheckoutUrl: session.url || payment.providerCheckoutUrl,
      metadata: session as any,
    },
  });
}
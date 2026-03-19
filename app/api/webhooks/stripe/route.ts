import { NextRequest, NextResponse } from "next/server";
import { syncPaymentStatusFromCheckoutSession } from "@/lib/payments/service";
import { verifyStripeWebhookSignature } from "@/lib/payments/stripe";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function POST(req: NextRequest) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  if (!endpointSecret) {
    return jsonError("STRIPE_WEBHOOK_SECRET no está configurado", 500);
  }

  const signature = req.headers.get("stripe-signature");
  const valid = verifyStripeWebhookSignature(raw, signature, endpointSecret);
  if (!valid) return jsonError("Invalid Stripe signature", 401);

  const event = JSON.parse(raw);
  const session = event?.data?.object;

  switch (event?.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      await syncPaymentStatusFromCheckoutSession(session);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ ok: true, ignored: true, type: event?.type ?? null });
  }
}

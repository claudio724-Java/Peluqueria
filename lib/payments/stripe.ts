import crypto from "crypto";

type StripeCheckoutInput = {
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  stripeSecretKey: string;
  customerEmail?: string | null;
  metadata?: Record<string, string | undefined | null>;
  expiresAt?: number;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status?: string;
  status?: string;
  expires_at?: number | null;
  metadata?: Record<string, string>;
};

function stripeApiBase() {
  return process.env.STRIPE_API_BASE_URL || "https://api.stripe.com";
}

function assertAmount(amountCents: number) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("El importe del pago debe ser mayor que 0");
  }
}

function formEncodeCheckoutBody(input: StripeCheckoutInput) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  params.set("line_items[0][price_data][product_data][name]", input.description);

  if (input.customerEmail) params.set("customer_email", input.customerEmail);
  if (input.expiresAt) params.set("expires_at", String(input.expiresAt));

  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    if (value) params.set(`metadata[${key}]`, value);
  }

  return params.toString();
}

async function stripeRequest<T>(path: string, stripeSecretKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${stripeApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || `Stripe request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput) {
  assertAmount(input.amountCents);

  return stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", input.stripeSecretKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formEncodeCheckoutBody(input),
  });
}

export async function getStripeCheckoutSession(sessionId: string, stripeSecretKey: string) {
  return stripeRequest<StripeCheckoutSession>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    stripeSecretKey
  );
}

function safeEqualHex(expected: string, candidate: string) {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  endpointSecret: string
) {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader
      .split(",")
      .map((chunk) => chunk.trim())
      .map((chunk) => {
        const [key, value] = chunk.split("=");
        return [key, value] as const;
      })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const toleranceSeconds = 300;
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;

  const payloadToSign = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", endpointSecret)
    .update(payloadToSign, "utf8")
    .digest("hex");

  return safeEqualHex(expected, signature);
}
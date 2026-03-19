import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { createPaymentLink } from "@/lib/payments/service";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const items = await prisma.payment.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      appointment: {
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid JSON", 400);

  try {
    const payment = await createPaymentLink({
      salonId,
      appointmentId: typeof body.appointmentId === "string" ? body.appointmentId : undefined,
      amountCents: typeof body.amountCents === "number" ? body.amountCents : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      customerName: typeof body.customerName === "string" ? body.customerName : undefined,
      customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : undefined,
      customerEmail: typeof body.customerEmail === "string" ? body.customerEmail : undefined,
      metadata: typeof body.metadata === "object" ? body.metadata : undefined,
    });

    return NextResponse.json({ ok: true, item: payment }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo crear el pago", 400);
  }
}

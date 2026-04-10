import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import { getStripeCheckoutSession } from "@/lib/payments/stripe";
import { syncPaymentStatusFromCheckoutSession } from "@/lib/payments/service";

async function syncSuccessfulPayment(paymentId?: string, sessionId?: string) {
  if (!paymentId || !sessionId) return;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      salon: {
        select: {
          stripeSecretKeyEncrypted: true,
        },
      },
    },
  });

  if (!payment?.salon?.stripeSecretKeyEncrypted) return;

  try {
    const stripeSecretKey = decryptText(payment.salon.stripeSecretKeyEncrypted);
    const session = await getStripeCheckoutSession(sessionId, stripeSecretKey);
    await syncPaymentStatusFromCheckoutSession(session);
  } catch {
    // Si falla la sincronización aquí, el webhook puede terminar actualizando el pago igualmente.
  }
}

export default async function PagoExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string; session_id?: string }>;
}) {
  const params = await searchParams;

  await syncSuccessfulPayment(params.paymentId, params.session_id);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Pago recibido</h1>
        <p className="text-muted-foreground">
          Gracias. Tu pago se ha procesado correctamente.
          {params.paymentId ? ` Referencia: ${params.paymentId}` : ""}
        </p>
      </div>

      <div className="rounded-2xl border p-6 text-left">
        <p className="text-sm text-muted-foreground">
          Ya puedes cerrar esta ventana o volver a escribir por WhatsApp para confirmar tu cita.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

export default async function PagoExitoPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  const params = await searchParams;

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

      <Link href="/" className="text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function PagoCanceladoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Pago no completado</h1>
        <p className="text-muted-foreground">
          El pago fue cancelado o quedó pendiente. Puedes volver a solicitar el enlace por WhatsApp.
        </p>
      </div>

      <div className="rounded-2xl border p-6 text-left">
        <p className="text-sm text-muted-foreground">
          Si necesitas ayuda, responde al mismo chat de WhatsApp para que Make te envíe un nuevo enlace.
        </p>
      </div>

      <Link href="/" className="text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}

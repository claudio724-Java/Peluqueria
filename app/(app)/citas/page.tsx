"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/client-api";
import { mapAppointmentToCita } from "@/lib/mappers";
import type { Cita } from "@/lib/types";

type ApiAppointmentsResponse = { ok: true; items: any[] };

type ApiSalonResponse = {
  ok: true;
  items: Array<{
    id: string;
    stripeEnabled: boolean;
    hasStripeWebhookSecret: boolean;
    hasStripeSecretKey: boolean;
  }>;
};

function statusLabel(s: Cita["estado"]) {
  switch (s) {
    case "confirmada":
      return "CONFIRMADA";
    case "pendiente":
      return "PENDIENTE";
    case "cancelada":
      return "CANCELADA";
    case "completada":
      return "COMPLETADA";
    case "no_show":
      return "NO SHOW";
    default:
      return s;
  }
}

function paymentLabel(cita: Cita) {
  switch (cita.pago?.estado) {
    case "pagado":
      return "PAGADO";
    case "caducado":
      return "CADUCADO";
    case "fallido":
      return "FALLIDO";
    case "cancelado":
      return "CANCELADO";
    case "pendiente":
      return "PENDIENTE";
    default:
      return "SIN LINK";
  }
}

export default function CitasPage() {
  const { data: session } = useSession();
  const isStaff = (session?.user as any)?.role === "STAFF";
  const [items, setItems] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPaymentFor, setCreatingPaymentFor] = useState<string | null>(null);

  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [hasStripeWebhookSecret, setHasStripeWebhookSecret] = useState(false);
  const [hasStripeSecretKey, setHasStripeSecretKey] = useState(false);

  async function load() {
    setLoading(true);

    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const [appointmentsData, salonData] = await Promise.all([
      apiGet<ApiAppointmentsResponse>(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      ),
      apiGet<ApiSalonResponse>("/api/salons"),
    ]);

    setItems(appointmentsData.items.map(mapAppointmentToCita));

    const salon = salonData.items?.[0];
    setStripeEnabled(Boolean(salon?.stripeEnabled));
    setHasStripeWebhookSecret(Boolean(salon?.hasStripeWebhookSecret));
    setHasStripeSecretKey(Boolean(salon?.hasStripeSecretKey));

    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function cancel(id: string) {
    await apiPost(`/api/appointments/${id}/cancel`, { reason: "Cancelada desde panel" });
    await load();
  }

  async function createPaymentLink(cita: Cita) {
    if (!canUseStripe) return;

    try {
      setCreatingPaymentFor(cita.id);

      const res = await apiPost<{ ok: true; item: { providerCheckoutUrl: string | null } }>(
        "/api/payments",
        {
          appointmentId: cita.id,
        }
      );

      if (res.item.providerCheckoutUrl) {
        window.open(res.item.providerCheckoutUrl, "_blank", "noopener,noreferrer");
      }

      await load();
    } finally {
      setCreatingPaymentFor(null);
    }
  }

  const canUseStripe = useMemo(() => {
    return stripeEnabled && hasStripeWebhookSecret && hasStripeSecretKey;
  }, [stripeEnabled, hasStripeWebhookSecret, hasStripeSecretKey]);

  const stripeConfigMessage = useMemo(() => {
    if (!stripeEnabled) return "Stripe está deshabilitado en Ajustes.";
    if (!hasStripeWebhookSecret || !hasStripeSecretKey) {
      return "Falta configurar Stripe en Ajustes.";
    }
    return null;
  }, [stripeEnabled, hasStripeWebhookSecret, hasStripeSecretKey]);

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Citas"
        subtitle={loading ? "Cargando..." : isStaff ? "Consulta tus citas asignadas" : "Gestiona las citas y sus cobros"}
      />

      {stripeConfigMessage ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{stripeConfigMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">{isStaff ? "" : "Acciones"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => {
                const paymentDisabled =
                  !canUseStripe ||
                  creatingPaymentFor === a.id ||
                  a.pago?.estado === "pagado" ||
                  a.estado === "cancelada";

                const paymentTitle = !canUseStripe
                  ? "Stripe no está habilitado o está incompleto en Ajustes"
                  : a.pago?.estado === "pagado"
                    ? "La cita ya está pagada"
                    : a.estado === "cancelada"
                      ? "No se puede cobrar una cita cancelada"
                      : "";

                return (
                  <TableRow key={a.id}>
                    <TableCell>{a.fecha}</TableCell>
                    <TableCell>{a.hora}</TableCell>
                    <TableCell>{a.cliente.nombre}</TableCell>
                    <TableCell>{a.servicio.nombre}</TableCell>
                    <TableCell>{a.empleado.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.estado === "cancelada"
                            ? "destructive"
                            : a.estado === "confirmada"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {statusLabel(a.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.pago?.estado === "pagado" ? "default" : "secondary"}>
                        {paymentLabel(a)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
{!isStaff ? (<>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createPaymentLink(a)}
                          disabled={paymentDisabled}
                          title={paymentTitle}
                        >
                          {!canUseStripe
                            ? "Cobro no disponible"
                            : creatingPaymentFor === a.id
                              ? "Creando..."
                              : a.pago?.urlCheckout
                                ? "Abrir cobro"
                                : "Crear cobro"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancel(a.id)}
                          disabled={a.estado === "cancelada"}
                        >
                          Cancelar
                        </Button>
                        </>) : <span className="text-sm text-muted-foreground">Solo lectura</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No hay citas.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
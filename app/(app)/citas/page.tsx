"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/client-api";
import { mapAppointmentToCita } from "@/lib/mappers";
import type { Cita } from "@/lib/types";

type ApiAppointmentsResponse = { ok: true; items: any[] };

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

export default function CitasPage() {
  const [items, setItems] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await apiGet<ApiAppointmentsResponse>(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    setItems(data.items.map(mapAppointmentToCita));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function cancel(id: string) {
    await apiPost(`/api/appointments/${id}/cancel`, { reason: "Cancelada desde panel" });
    await load();
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader title="Citas" subtitle={loading ? "Cargando..." : "Gestiona las citas"} />

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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.fecha}</TableCell>
                  <TableCell>{a.hora}</TableCell>
                  <TableCell>{a.cliente.nombre}</TableCell>
                  <TableCell>{a.servicio.nombre}</TableCell>
                  <TableCell>{a.empleado.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={a.estado === "cancelada" ? "destructive" : a.estado === "confirmada" ? "default" : "secondary"}>
                      {statusLabel(a.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => cancel(a.id)} disabled={a.estado === "cancelada"}>
                      Cancelar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
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

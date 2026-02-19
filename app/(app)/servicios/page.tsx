"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/client-api";

type Service = { id: string; name: string; durationMin: number; priceCents: number; bufferMin: number; isActive: boolean };

export default function ServiciosPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Service[] }>("/api/services");
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function createDemo() {
    await apiPost("/api/services", { name: "Servicio nuevo", durationMin: 30, priceCents: 2000, bufferMin: 0, isActive: true });
    await load();
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader title="Servicios" subtitle={loading ? "Cargando..." : "Servicios disponibles"} action={<Button onClick={createDemo}>Nuevo (demo)</Button>} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Buffer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.durationMin} min</TableCell>
                  <TableCell>€{Math.round(s.priceCents / 100)}</TableCell>
                  <TableCell>{s.bufferMin} min</TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                    No hay servicios.
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

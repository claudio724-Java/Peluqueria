"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/client-api";

type Customer = { id: string; name: string; phone: string; notes: string | null; consentMessaging: boolean };

export default function ClientesPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Customer[] }>(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function createDemo() {
    await apiPost("/api/customers", { name: "Cliente nuevo", phone: "+34 600 000 001", consentMessaging: true });
    await load(q);
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader title="Clientes" subtitle={loading ? "Cargando..." : "Tu base de clientes"} />

      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono" />
        <Button variant="outline" onClick={() => load(q)}>
          Buscar
        </Button>
        <Button onClick={createDemo}>Nuevo (demo)</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Consentimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.consentMessaging ? "Sí" : "No"}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-10">
                    No hay clientes.
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

"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/client-api";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  isActive: boolean;
};

export default function ServiciosPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Service[] }>("/api/services");
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!durationMin || Number(durationMin) <= 0) {
      setError("La duración debe ser mayor que 0.");
      return;
    }

    if (price === "" || Number(price) < 0) {
      setError("El precio debe ser 0 o mayor.");
      return;
    }

    try {
      setSaving(true);

      await apiPost("/api/services", {
        name: name.trim(),
        durationMin: Number(durationMin),
        priceCents: Math.round(Number(price) * 100),
        bufferMin: 0,
        isActive: true,
      });

      setName("");
      setDurationMin("");
      setPrice("");
      await load();
    } catch {
      setError("No se pudo crear el servicio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Servicios"
        subtitle={loading ? "Cargando..." : "Servicios disponibles"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Crear servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej. Corte de caballero"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMin">Duración (min)</Label>
              <Input
                id="durationMin"
                type="number"
                min="1"
                placeholder="30"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio (€)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="15.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 md:col-span-3">{error}</p>
            ) : null}

            <div className="md:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Crear servicio"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.durationMin} min</TableCell>
                  <TableCell>€{(s.priceCents / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
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
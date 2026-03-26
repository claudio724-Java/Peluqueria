"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client-api";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  isActive: boolean;
};

type ServicePayload = {
  name: string;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  durationMin: "",
  price: "",
};

export default function ServiciosPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Service | null>(null);

  async function load() {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Service[] }>("/api/services");
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const selectedPrice = useMemo(() => {
    if (!selected) return "";
    return (selected.priceCents / 100).toFixed(2);
  }, [selected]);

  function resetForm() {
    setForm(emptyForm);
  }

  function validate(current: typeof emptyForm) {
    if (!current.name.trim()) return "El nombre es obligatorio.";
    if (!current.durationMin || Number(current.durationMin) <= 0) {
      return "La duración debe ser mayor que 0.";
    }
    if (current.price === "" || Number(current.price) < 0) {
      return "El precio debe ser 0 o mayor.";
    }
    return null;
  }

  function toPayload(current: typeof emptyForm): ServicePayload {
    return {
      name: current.name.trim(),
      durationMin: Number(current.durationMin),
      priceCents: Math.round(Number(current.price) * 100),
      bufferMin: 0,
      isActive: true,
    };
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    const validation = validate(form);
    if (validation) {
      setCreateError(validation);
      return;
    }

    try {
      setSavingCreate(true);
      await apiPost("/api/services", toPayload(form));
      setCreateOpen(false);
      resetForm();
      await load();
    } catch {
      setCreateError("No se pudo crear el servicio.");
    } finally {
      setSavingCreate(false);
    }
  }

  function openEdit(service: Service) {
    setSelected(service);
    setForm({
      name: service.name,
      durationMin: String(service.durationMin),
      price: (service.priceCents / 100).toFixed(2),
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    setEditError(null);
    const validation = validate(form);
    if (validation) {
      setEditError(validation);
      return;
    }

    try {
      setSavingEdit(true);
      await apiPatch(`/api/services/${selected.id}`, toPayload(form));
      setEditOpen(false);
      setSelected(null);
      resetForm();
      await load();
    } catch {
      setEditError("No se pudo modificar el servicio.");
    } finally {
      setSavingEdit(false);
    }
  }

  function openDelete(service: Service) {
    setSelected(service);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!selected) return;

    try {
      setSavingDelete(true);
      await apiDelete(`/api/services/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      await load();
    } catch {
      setDeleteOpen(false);
      setSelected(null);
    } finally {
      setSavingDelete(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Servicios"
        subtitle={loading ? "Cargando..." : "Servicios disponibles"}
        action={
          <Button
            onClick={() => {
              resetForm();
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo servicio
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.durationMin} min</TableCell>
                  <TableCell>€{(s.priceCents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No hay servicios.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear servicio</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nombre</Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Corte"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-duration">Duración (min)</Label>
              <Input
                id="create-duration"
                type="number"
                min="1"
                value={form.durationMin}
                onChange={(e) => setForm((p) => ({ ...p, durationMin: e.target.value }))}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-price">Precio (€)</Label>
              <Input
                id="create-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="15.00"
              />
            </div>

            {createError ? <p className="text-sm text-red-600">{createError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCreate}>
                {savingCreate ? "Guardando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelected(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar servicio</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duración (min)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={form.durationMin}
                onChange={(e) => setForm((p) => ({ ...p, durationMin: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Precio (€)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price || selectedPrice}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>

            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar servicio</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres borrar {selected?.name ? `"${selected.name}"` : "este servicio"}?
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={savingDelete}>
              {savingDelete ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
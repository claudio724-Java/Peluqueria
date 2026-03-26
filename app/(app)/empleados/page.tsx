"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Staff = {
  id: string;
  name: string;
  role: string | null;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  role: "",
};

export default function EmpleadosPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Staff | null>(null);

  async function load() {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Staff[] }>("/api/staff");
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm(emptyForm);
  }

  function validate(current: typeof emptyForm) {
    if (!current.name.trim()) return "El nombre es obligatorio.";
    return null;
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

      await apiPost("/api/staff", {
        name: form.name.trim(),
        role: form.role.trim() || null,
        isActive: true,
      });

      setCreateOpen(false);
      resetForm();
      await load();
    } catch {
      setCreateError("No se pudo crear el empleado.");
    } finally {
      setSavingCreate(false);
    }
  }

  function openEdit(staff: Staff) {
    setSelected(staff);
    setForm({
      name: staff.name,
      role: staff.role ?? "",
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

      await apiPatch(`/api/staff/${selected.id}`, {
        name: form.name.trim(),
        role: form.role.trim() || null,
        isActive: true,
      });

      setEditOpen(false);
      setSelected(null);
      resetForm();
      await load();
    } catch {
      setEditError("No se pudo modificar el empleado.");
    } finally {
      setSavingEdit(false);
    }
  }

  function openDelete(staff: Staff) {
    setSelected(staff);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!selected) return;

    try {
      setSavingDelete(true);
      setDeleteError(null);

      await apiDelete(`/api/staff/${selected.id}`);

      setDeleteOpen(false);
      setSelected(null);
      await load();
    } catch {
      setDeleteError("No se pudo borrar el empleado.");
    } finally {
      setSavingDelete(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Empleados"
        subtitle={loading ? "Cargando..." : "Tu equipo"}
        action={
          <Button
            onClick={() => {
              resetForm();
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo empleado
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.role ?? "-"}</TableCell>
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
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    No hay empleados.
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
            <DialogTitle>Crear empleado</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nombre</Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. María"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Rol</Label>
              <Input
                id="create-role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Ej. Estilista"
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
            <DialogTitle>Modificar empleado</DialogTitle>
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
              <Label htmlFor="edit-role">Rol</Label>
              <Input
                id="edit-role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Ej. Barbero, Colorista..."
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
            <DialogTitle>Borrar empleado</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres borrar {selected?.name ? `"${selected.name}"` : "este empleado"}?
          </p>

          {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}

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
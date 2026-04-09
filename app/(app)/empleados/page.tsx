"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  email: string | null;
  phone: string | null;
  role: string | null;
  isActive: boolean;
  hasAccount: boolean;
  accountActive: boolean | null;
};

type MeResponse = {
  ok: true;
  user: {
    role?: string;
  };
};

type ScheduleRow = {
  dayOfWeek: number;
  enabled: boolean;
  start: string;
  end: string;
};

const emptyForm = {
  name: "",
  role: "",
  phone: "",
  email: "",
  password: "",
  isActive: true,
};

const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const defaultScheduleRows: ScheduleRow[] = dayLabels.map((_, dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
  start: "09:00",
  end: "20:00",
}));

function minToTime(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const mins = (value % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function timeToMin(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function buildScheduleRows(items: { dayOfWeek: number; startMin: number; endMin: number }[]): ScheduleRow[] {
  const map = new Map(items.map((item) => [item.dayOfWeek, item]));
  return defaultScheduleRows.map((row) => {
    const current = map.get(row.dayOfWeek);
    if (!current) return { ...row };
    return {
      dayOfWeek: row.dayOfWeek,
      enabled: true,
      start: minToTime(current.startMin),
      end: minToTime(current.endMin),
    };
  });
}

export default function EmpleadosPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(defaultScheduleRows);

  const scheduleSummary = useMemo(() => {
    const enabled = scheduleRows.filter((row) => row.enabled);
    if (!enabled.length) return "Sin horario configurado";
    return enabled
      .map((row) => `${dayLabels[row.dayOfWeek]} ${row.start}-${row.end}`)
      .join(" · ");
  }, [scheduleRows]);

  async function load() {
    setLoading(true);
    try {
      const [data, me] = await Promise.all([
        apiGet<{ ok: true; items: Staff[] }>("/api/staff"),
        apiGet<MeResponse>("/api/me"),
      ]);
      setItems(data.items);
      setIsOwner(me.user?.role === "OWNER");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm(emptyForm);
  }

  function openCreate() {
    resetForm();
    setCreateError(null);
    setCreateOpen(true);
  }

  function openEdit(item: Staff) {
    setSelected(item);
    setForm({
      name: item.name,
      role: item.role ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      password: "",
      isActive: item.isActive,
    });
    setEditError(null);
    setEditOpen(true);
  }

  function openDelete(item: Staff) {
    setSelected(item);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function openSchedule(item: Staff) {
    if (!isOwner) return;
    setSelected(item);
    setScheduleOpen(true);
    setScheduleError(null);
    setLoadingSchedule(true);
    try {
      const data = await apiGet<{
        ok: true;
        staff: {
          id: string;
          name: string;
          schedules: { dayOfWeek: number; startMin: number; endMin: number }[];
        };
      }>(`/api/staff/${item.id}/schedule`);
      setScheduleRows(buildScheduleRows(data.staff.schedules));
    } catch {
      setScheduleError("No se pudo cargar el horario del empleado.");
      setScheduleRows(defaultScheduleRows);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!form.email.trim() || !form.password.trim()) {
      setCreateError("El email y la contraseña son obligatorios.");
      return;
    }

    try {
      setSavingCreate(true);
      await apiPost("/api/staff", {
        name: form.name,
        role: form.role,
        phone: form.phone,
        email: form.email,
        password: form.password,
        isActive: form.isActive,
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

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setEditError(null);

    try {
      setSavingEdit(true);
      await apiPatch(`/api/staff/${selected.id}`, {
        name: form.name,
        role: form.role,
        phone: form.phone,
        email: form.email,
        password: form.password,
        isActive: form.isActive,
      });
      setEditOpen(false);
      setSelected(null);
      resetForm();
      await load();
    } catch {
      setEditError("No se pudo actualizar el empleado.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleteError(null);

    try {
      setSavingDelete(true);
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

  async function handleSaveSchedule() {
    if (!selected) return;
    setScheduleError(null);

    const invalid = scheduleRows.find((row) => row.enabled && timeToMin(row.start) >= timeToMin(row.end));
    if (invalid) {
      setScheduleError(`Revisa ${dayLabels[invalid.dayOfWeek]}: la hora de inicio debe ser menor que la de fin.`);
      return;
    }

    try {
      setSavingSchedule(true);
      const schedules = scheduleRows
        .filter((row) => row.enabled)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startMin: timeToMin(row.start),
          endMin: timeToMin(row.end),
        }));

      const res = await fetch(`/api/staff/${selected.id}/schedule`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });

      if (!res.ok) {
        throw new Error("PUT failed");
      }

      setScheduleOpen(false);
      setSelected(null);
    } catch {
      setScheduleError("No se pudo guardar el horario del empleado.");
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader title="Empleados" subtitle={loading ? "Cargando..." : "Gestiona el equipo y sus accesos"} />

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Añadir empleado
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.phone || "Sin teléfono"}</div>
                  </TableCell>
                  <TableCell>
                    <div>{item.email || "Sin email"}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.hasAccount ? (item.accountActive ? "Cuenta activa" : "Cuenta suspendida") : "Sin cuenta"}
                    </div>
                  </TableCell>
                  <TableCell>{item.role || "Empleado"}</TableCell>
                  <TableCell>{item.isActive ? "Activo" : "Inactivo"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isOwner ? (
                        <Button variant="outline" size="sm" onClick={() => openSchedule(item)}>
                          <Clock3 className="mr-2 h-4 w-4" />Horario
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(item)}>
                        <Trash2 className="mr-2 h-4 w-4" />Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Todavía no hay empleados.
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
            <DialogTitle>Nuevo empleado</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="create-name">Nombre</Label>
              <Input id="create-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Puesto</Label>
              <Input id="create-role" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="Colorista, barbero..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Teléfono</Label>
              <Input id="create-phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email de acceso</Label>
              <Input id="create-email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Contraseña</Label>
              <Input id="create-password" type="password" minLength={6} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Cuenta activa</p>
                <p className="text-xs text-muted-foreground">Podrá iniciar sesión y ver solo sus citas.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
            {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCreate}>{savingCreate ? "Guardando..." : "Crear empleado"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input id="edit-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Puesto</Label>
              <Input id="edit-role" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input id="edit-phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email de acceso</Label>
              <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva contraseña</Label>
              <Input id="edit-password" type="password" minLength={6} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Déjalo vacío para mantener la actual" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Cuenta activa</p>
                <p className="text-xs text-muted-foreground">Si la desactivas, el empleado no podrá entrar.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se eliminará el perfil y su cuenta de acceso. Si tiene citas asociadas, el empleado quedará inactivo.
            </p>
            {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={savingDelete}>
                {savingDelete ? "Borrando..." : "Confirmar borrado"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Horario de {selected?.name || "empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Solo los usuarios owner pueden editar el horario individual del personal. Estos bloques se usan para calcular la disponibilidad.
            </p>

            {loadingSchedule ? (
              <p className="text-sm text-muted-foreground">Cargando horario...</p>
            ) : (
              <div className="space-y-3">
                {scheduleRows.map((row, index) => (
                  <div key={row.dayOfWeek} className="grid grid-cols-[120px_90px_1fr_1fr] items-center gap-3 rounded-md border p-3">
                    <div className="font-medium">{dayLabels[row.dayOfWeek]}</div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={(checked) =>
                          setScheduleRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, enabled: checked } : item
                            )
                          )
                        }
                      />
                      <span className="text-sm text-muted-foreground">{row.enabled ? "Abierto" : "Libre"}</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`start-${row.dayOfWeek}`}>Inicio</Label>
                      <Input
                        id={`start-${row.dayOfWeek}`}
                        type="time"
                        value={row.start}
                        disabled={!row.enabled}
                        onChange={(e) =>
                          setScheduleRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, start: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${row.dayOfWeek}`}>Fin</Label>
                      <Input
                        id={`end-${row.dayOfWeek}`}
                        type="time"
                        value={row.end}
                        disabled={!row.enabled}
                        onChange={(e) =>
                          setScheduleRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, end: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              Resumen: {scheduleSummary}
            </div>

            {scheduleError ? <p className="text-sm text-red-600">{scheduleError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={handleSaveSchedule} disabled={savingSchedule || loadingSchedule}>
                {savingSchedule ? "Guardando..." : "Guardar horario"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

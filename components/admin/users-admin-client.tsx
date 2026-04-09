"use client";

import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, UserX } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client-api";

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserForm = {
  name: string;
  email: string;
  role: UserItem["role"];
  password: string;
  isActive: boolean;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  role: "STAFF",
  password: "",
  isActive: true,
};

const roleOptions: Array<{ value: UserItem["role"]; label: string }> = [
  { value: "OWNER", label: "Propietario" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
];

function roleLabel(role: UserItem["role"]) {
  return roleOptions.find((item) => item.value === role)?.label ?? role;
}

export function UsersAdminClient({ canAssignOwner }: { canAssignOwner: boolean }) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const visibleRoleOptions = useMemo(
    () => roleOptions.filter((option) => canAssignOwner || option.value !== "OWNER"),
    [canAssignOwner]
  );

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ ok: true; items: UserItem[] }>("/api/admin/users");
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({ ...emptyForm, role: canAssignOwner ? "STAFF" : "MANAGER" });
  }

  function openCreate() {
    resetForm();
    setSelected(null);
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(user: UserItem) {
    setSelected(user);
    setForm({
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      password: "",
      isActive: user.isActive,
    });
    setError(null);
    setEditOpen(true);
  }

  function openDelete(user: UserItem) {
    setSelected(user);
    setError(null);
    setDeleteOpen(true);
  }

  function validate(current: UserForm, isCreate: boolean) {
    if (!current.name.trim()) return "El nombre es obligatorio.";
    if (!current.email.trim()) return "El email es obligatorio.";
    if (isCreate && current.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!visibleRoleOptions.some((option) => option.value === current.role)) {
      return "No tienes permisos para asignar ese rol.";
    }
    return null;
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validate(form, true);
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiPost("/api/admin/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        isActive: form.isActive,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    const validation = validate(form, false);
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiPatch(`/api/admin/users/${selected.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        isActive: form.isActive,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la cuenta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      setSaving(true);
      setError(null);
      await apiDelete(`/api/admin/users/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar la cuenta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Administración"
        subtitle={loading ? "Cargando cuentas..." : "Gestiona accesos especiales y cuentas internas"}
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva cuenta
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Con acceso</p>
                <p className="text-2xl font-semibold">{items.filter((item) => item.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserX className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Suspendidas</p>
                <p className="text-2xl font-semibold">{items.filter((item) => !item.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Con permiso especial</p>
                <p className="text-2xl font-semibold">{items.filter((item) => item.role !== "STAFF").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[180px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name ?? "Sin nombre"}</div>
                    {user.id === currentUserId ? (
                      <div className="text-xs text-muted-foreground">Tu cuenta</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabel(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Activa" : "Suspendida"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No hay cuentas disponibles.
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
            <DialogTitle>Crear cuenta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <UserFormFields form={form} setForm={setForm} roleOptions={visibleRoleOptions} showPasswordHelp />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear cuenta"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar cuenta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <UserFormFields form={form} setForm={setForm} roleOptions={visibleRoleOptions} />
            <p className="text-xs text-muted-foreground">Deja la contraseña en blanco para no cambiarla.</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Vas a borrar la cuenta de <span className="font-medium">{selected?.name ?? selected?.email}</span>.
            </p>
            <p className="text-muted-foreground">Esta acción no se puede deshacer.</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserFormFields({
  form,
  setForm,
  roleOptions,
  showPasswordHelp = false,
}: {
  form: UserForm;
  setForm: Dispatch<SetStateAction<UserForm>>;
  roleOptions: Array<{ value: UserItem["role"]; label: string }>;
  showPasswordHelp?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="user-name">Nombre</Label>
        <Input id="user-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">Email</Label>
        <Input id="user-email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role">Rol</Label>
        <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as UserItem["role"] }))}>
          <SelectTrigger id="user-role">
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-password">Contraseña</Label>
        <Input id="user-password" type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
        {showPasswordHelp ? <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p> : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Cuenta activa</p>
          <p className="text-xs text-muted-foreground">Desactívala para suspender el acceso sin borrar la cuenta.</p>
        </div>
        <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
      </div>
    </>
  );
}

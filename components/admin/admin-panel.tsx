"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client-api";

type UserItem = {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER" | "STAFF";
  isActive: boolean;
  salonId: string | null;
  createdAt: string;
  updatedAt: string;
  salon: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type UsersResponse = { ok: true; items: UserItem[] };

type FormState = {
  id?: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  salonName: string;
  password: string;
};

const initialForm: FormState = {
  email: "",
  name: "",
  role: "OWNER",
  salonName: "",
  password: "",
};

export function AdminPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<UsersResponse>("/api/admin/users");
      setUsers(data.items);
    } catch (error) {
      setMessage("No se pudo cargar el panel de cuentas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.email, user.name ?? "", user.salon?.name ?? "", user.role]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [filter, users]);

  function startEdit(user: UserItem) {
    setForm({
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      salonName: user.salon?.name ?? "",
      password: "",
    });
    setMessage("");
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      if (form.id) {
        await apiPatch(`/api/admin/users/${form.id}`, {
          email: form.email,
          name: form.name,
          role: form.role,
          salonName: form.salonName,
          ...(form.password ? { password: form.password } : {}),
        });
        setMessage("Cuenta actualizada correctamente.");
      } else {
        await apiPost("/api/admin/users", {
          email: form.email,
          name: form.name,
          role: form.role,
          salonName: form.salonName,
          password: form.password,
        });
        setMessage("Cuenta creada correctamente.");
      }

      resetForm();
      await load();
    } catch (error) {
      setMessage("No se pudo guardar la cuenta. Revisa los datos e inténtalo otra vez.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: UserItem) {
    setMessage("");
    try {
      await apiPatch(`/api/admin/users/${user.id}/toggle-status`, {});
      await load();
      setMessage(user.isActive ? "Cuenta suspendida." : "Cuenta reactivada.");
    } catch {
      setMessage("No se pudo cambiar el estado de la cuenta.");
    }
  }

  async function removeUser(user: UserItem) {
    const confirmed = window.confirm(`¿Seguro que quieres borrar la cuenta ${user.email}?`);
    if (!confirmed) return;

    setMessage("");
    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      await load();
      setMessage("Cuenta borrada correctamente.");
      if (form.id === user.id) resetForm();
    } catch {
      setMessage("No se pudo borrar la cuenta.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar cuenta" : "Crear cuenta"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitForm}>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salonName">Nombre del salón</Label>
              <Input id="salonName" required value={form.salonName} onChange={(e) => setForm((s) => ({ ...s, salonName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(value) => setForm((s) => ({ ...s, role: value as FormState["role"] }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">OWNER</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{form.id ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
              <Input
                id="password"
                type="password"
                required={!form.id}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear cuenta"}
              </Button>
              {form.id ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Cuentas</CardTitle>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por email, salón o rol"
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando cuentas...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Cuenta</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Salón</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b align-top">
                      <td className="px-3 py-3">
                        <div className="font-medium">{user.name || "Sin nombre"}</div>
                        <div className="text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-3 py-3">{user.role}</td>
                      <td className="px-3 py-3">
                        <div>{user.salon?.name ?? "Sin salón"}</div>
                        <div className="text-muted-foreground">{user.salon?.slug ?? "-"}</div>
                      </td>
                      <td className="px-3 py-3">{user.isActive ? "Activa" : "Suspendida"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(user)}>
                            {user.isActive ? "Suspender" : "Reactivar"}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeUser(user)}>
                            Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

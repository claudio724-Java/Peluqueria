"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/client-api";
import { NewStaffDialog } from "@/components/staff/new-staff-dialog"


type Staff = { id: string; name: string; role: string | null; isActive: boolean };

export default function EmpleadosPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await apiGet<{ ok: true; items: Staff[] }>("/api/staff");
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

 const [staff, setStaff] = useState<any[]>([])

async function loadStaff() {
  setLoading(true)
  const res = await fetch("/api/staff")
  const data = await res.json()
  if (data.ok) setStaff(data.items)
  setLoading(false)
}

useEffect(() => {
  loadStaff()
}, [])

  return (
    <div className="space-y-6 p-6">
<AppHeader
  title="Empleados"
  subtitle={loading ? "Cargando..." : "Tu equipo"}
  action={<NewStaffDialog onCreated={() => window.location.reload()} />}
/>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.role ?? "-"}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-10">
                    No hay empleados.
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

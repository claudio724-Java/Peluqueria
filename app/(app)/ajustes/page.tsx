"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Store, Bell, Clock, Shield } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/client-api";

type SalonBusinessHour = {
  dayOfWeek: number;
  shift: "MORNING" | "AFTERNOON";
  isOpen: boolean;
  startMin: number | null;
  endMin: number | null;
};

type Salon = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  slotIntervalMin: number;
  businessHours: SalonBusinessHour[];
};

type DaySchedule = {
  dayOfWeek: number;
  label: string;
  morningOpen: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonOpen: boolean;
  afternoonStart: string;
  afternoonEnd: string;
};

const DAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

function minToTime(min: number | null | undefined) {
  if (min === null || min === undefined) return "";
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMin(value: string) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function buildSchedule(hours: SalonBusinessHour[]): DaySchedule[] {
  return DAYS.map((day) => {
    const morning = hours.find(
      (h) => h.dayOfWeek === day.dayOfWeek && h.shift === "MORNING"
    );
    const afternoon = hours.find(
      (h) => h.dayOfWeek === day.dayOfWeek && h.shift === "AFTERNOON"
    );

    return {
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      morningOpen: morning?.isOpen ?? false,
      morningStart: minToTime(morning?.startMin),
      morningEnd: minToTime(morning?.endMin),
      afternoonOpen: afternoon?.isOpen ?? false,
      afternoonStart: minToTime(afternoon?.startMin),
      afternoonEnd: minToTime(afternoon?.endMin),
    };
  });
}

export default function AjustesPage() {
  const [confirmReset, setConfirmReset] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [successGeneral, setSuccessGeneral] = useState<string | null>(null);

  const [errorSchedule, setErrorSchedule] = useState<string | null>(null);
  const [successSchedule, setSuccessSchedule] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [slotIntervalMin, setSlotIntervalMin] = useState("30");
  const [schedule, setSchedule] = useState<DaySchedule[]>(buildSchedule([]));

  async function loadSalon() {
    setLoading(true);

    try {
      const data = await apiGet<{ ok: true; items: Salon[] }>("/api/salons");
      const salon = data.items[0];

      if (salon) {
        setName(salon.name ?? "");
        setSlug(salon.slug ?? "");
        setPhone(salon.phone ?? "");
        setEmail(salon.email ?? "");
        setAddress(salon.address ?? "");
        setCurrency(salon.currency ?? "EUR");
        setTimezone(salon.timezone ?? "Europe/Madrid");
        setSlotIntervalMin(String(salon.slotIntervalMin ?? 30));
        setSchedule(buildSchedule(salon.businessHours ?? []));
      }
    } catch {
      setErrorGeneral("No se pudieron cargar los ajustes del salón.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSalon();
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day))
    );
  }

  async function handleSaveGeneral() {
    setErrorGeneral(null);
    setSuccessGeneral(null);

    if (!name.trim()) {
      setErrorGeneral("El nombre del salón es obligatorio.");
      return;
    }

    if (!slug.trim()) {
      setErrorGeneral("El slug es obligatorio.");
      return;
    }

    if (!timezone.trim()) {
      setErrorGeneral("La zona horaria es obligatoria.");
      return;
    }

    if (!slotIntervalMin || Number(slotIntervalMin) <= 0) {
      setErrorGeneral("El intervalo debe ser mayor que 0.");
      return;
    }

    try {
      setSavingGeneral(true);

      const businessHours = schedule.flatMap((day) => [
        {
          dayOfWeek: day.dayOfWeek,
          shift: "MORNING" as const,
          isOpen: day.morningOpen,
          startMin: day.morningOpen ? timeToMin(day.morningStart) : null,
          endMin: day.morningOpen ? timeToMin(day.morningEnd) : null,
        },
        {
          dayOfWeek: day.dayOfWeek,
          shift: "AFTERNOON" as const,
          isOpen: day.afternoonOpen,
          startMin: day.afternoonOpen ? timeToMin(day.afternoonStart) : null,
          endMin: day.afternoonOpen ? timeToMin(day.afternoonEnd) : null,
        },
      ]);

      await apiPatch("/api/salons", {
        name: name.trim(),
        slug: slug.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        currency,
        timezone: timezone.trim(),
        slotIntervalMin: Number(slotIntervalMin),
        businessHours,
      });

      setSuccessGeneral("Cambios generales guardados correctamente.");
      await loadSalon();
    } catch {
      setErrorGeneral("No se pudieron guardar los cambios.");
    } finally {
      setSavingGeneral(false);
    }
  }

  async function handleSaveSchedule() {
    setErrorSchedule(null);
    setSuccessSchedule(null);

    for (const day of schedule) {
      if (day.morningOpen) {
        if (!day.morningStart || !day.morningEnd) {
          setErrorSchedule(`Completa el horario de mañana de ${day.label}.`);
          return;
        }

        const start = timeToMin(day.morningStart);
        const end = timeToMin(day.morningEnd);

        if (start === null || end === null || start >= end) {
          setErrorSchedule(`El horario de mañana de ${day.label} no es válido.`);
          return;
        }
      }

      if (day.afternoonOpen) {
        if (!day.afternoonStart || !day.afternoonEnd) {
          setErrorSchedule(`Completa el horario de tarde de ${day.label}.`);
          return;
        }

        const start = timeToMin(day.afternoonStart);
        const end = timeToMin(day.afternoonEnd);

        if (start === null || end === null || start >= end) {
          setErrorSchedule(`El horario de tarde de ${day.label} no es válido.`);
          return;
        }
      }
    }

    try {
      setSavingSchedule(true);

      const businessHours = schedule.flatMap((day) => [
        {
          dayOfWeek: day.dayOfWeek,
          shift: "MORNING" as const,
          isOpen: day.morningOpen,
          startMin: day.morningOpen ? timeToMin(day.morningStart) : null,
          endMin: day.morningOpen ? timeToMin(day.morningEnd) : null,
        },
        {
          dayOfWeek: day.dayOfWeek,
          shift: "AFTERNOON" as const,
          isOpen: day.afternoonOpen,
          startMin: day.afternoonOpen ? timeToMin(day.afternoonStart) : null,
          endMin: day.afternoonOpen ? timeToMin(day.afternoonEnd) : null,
        },
      ]);

      await apiPatch("/api/salons", {
        name: name.trim(),
        slug: slug.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        currency,
        timezone: timezone.trim(),
        slotIntervalMin: Number(slotIntervalMin || 30),
        businessHours,
      });

      setSuccessSchedule("Horarios guardados correctamente.");
      await loadSalon();
    } catch {
      setErrorSchedule("No se pudieron guardar los horarios.");
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Ajustes"
        subtitle={loading ? "Cargando configuración..." : "Configuración del salón"}
      />

      <main className="max-w-4xl p-4 lg:p-6">
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="flex flex-col gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Store className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Información del salón</CardTitle>
                      <CardDescription>Datos básicos guardados en base de datos</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del salón</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Salón Central"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="Ej. salon-central"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+34 600 000 000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="salon@email.com"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, número, ciudad..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Moneda</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Zona horaria</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                          <SelectItem value="Atlantic/Canary">Atlantic/Canary</SelectItem>
                          <SelectItem value="Europe/London">Europe/London</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slotIntervalMin">Intervalo entre slots (min)</Label>
                      <Input
                        id="slotIntervalMin"
                        type="number"
                        min="5"
                        step="5"
                        value={slotIntervalMin}
                        onChange={(e) => setSlotIntervalMin(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>

                  {errorGeneral ? <p className="text-sm text-red-600">{errorGeneral}</p> : null}
                  {successGeneral ? (
                    <p className="text-sm text-green-600">{successGeneral}</p>
                  ) : null}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveGeneral} disabled={savingGeneral || loading}>
                      {savingGeneral ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                      <Shield className="h-4.5 w-4.5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Zona peligrosa</CardTitle>
                      <CardDescription>Acciones irreversibles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Resetear datos</p>
                      <p className="text-xs text-muted-foreground">
                        Elimina todas las citas y datos del salón
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>
                      Resetear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="horarios">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Horario del salón</CardTitle>
                    <CardDescription>
                      Configura mañana y tarde por separado para cada día.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {schedule.map((day) => (
                  <div key={day.dayOfWeek} className="space-y-4 rounded-lg border p-4">
                    <div className="font-medium">{day.label}</div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Mañana</span>
                          <Switch
                            checked={day.morningOpen}
                            onCheckedChange={(checked) =>
                              updateDay(day.dayOfWeek, { morningOpen: checked })
                            }
                          />
                        </div>

                        {day.morningOpen ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={day.morningStart}
                              onChange={(e) =>
                                updateDay(day.dayOfWeek, { morningStart: e.target.value })
                              }
                            />
                            <span className="text-sm text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={day.morningEnd}
                              onChange={(e) =>
                                updateDay(day.dayOfWeek, { morningEnd: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Cerrado por la mañana</p>
                        )}
                      </div>

                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Tarde</span>
                          <Switch
                            checked={day.afternoonOpen}
                            onCheckedChange={(checked) =>
                              updateDay(day.dayOfWeek, { afternoonOpen: checked })
                            }
                          />
                        </div>

                        {day.afternoonOpen ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={day.afternoonStart}
                              onChange={(e) =>
                                updateDay(day.dayOfWeek, { afternoonStart: e.target.value })
                              }
                            />
                            <span className="text-sm text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={day.afternoonEnd}
                              onChange={(e) =>
                                updateDay(day.dayOfWeek, { afternoonEnd: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Cerrado por la tarde</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {errorSchedule ? <p className="text-sm text-red-600">{errorSchedule}</p> : null}
                {successSchedule ? (
                  <p className="text-sm text-green-600">{successSchedule}</p>
                ) : null}

                <div className="flex justify-end">
                  <Button onClick={handleSaveSchedule} disabled={savingSchedule || loading}>
                    {savingSchedule ? "Guardando..." : "Guardar horarios"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Notificaciones</CardTitle>
                    <CardDescription>Vista pendiente de persistencia</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {[
                  {
                    title: "Recordatorio de cita",
                    desc: "Enviar recordatorio 24h antes de la cita",
                    defaultOn: true,
                  },
                  {
                    title: "Confirmación de reserva",
                    desc: "Enviar confirmación al crear una cita",
                    defaultOn: true,
                  },
                  {
                    title: "Notificación de cancelación",
                    desc: "Avisar al cliente cuando se cancela una cita",
                    defaultOn: true,
                  },
                  {
                    title: "Resumen diario",
                    desc: "Enviar resumen de citas del día al equipo",
                    defaultOn: false,
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultOn} />
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button variant="outline" disabled>
                    Guardar notificaciones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Resetear datos del salón?"
        description="Esta acción es irreversible y eliminará todas las citas y datos asociados."
        confirmLabel="Sí, resetear"
      />
    </>
  );
}
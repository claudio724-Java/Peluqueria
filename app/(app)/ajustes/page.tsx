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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, Bell, Clock, Shield, CreditCard } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/client-api";

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
  stripeEnabled: boolean;
  hasStripeWebhookSecret: boolean;
  hasStripeSecretKey: boolean;
  notifyAppointmentReminder: boolean;
  notifyBookingConfirmation: boolean;
  notifyCancellation: boolean;
  notifyDailySummary: boolean;
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
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [resettingSalon, setResettingSalon] = useState(false);

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [successGeneral, setSuccessGeneral] = useState<string | null>(null);

  const [errorSchedule, setErrorSchedule] = useState<string | null>(null);
  const [successSchedule, setSuccessSchedule] = useState<string | null>(null);
  const [errorNotifications, setErrorNotifications] = useState<string | null>(null);
  const [successNotifications, setSuccessNotifications] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [slotIntervalMin, setSlotIntervalMin] = useState("30");
  const [schedule, setSchedule] = useState<DaySchedule[]>(buildSchedule([]));

  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [notifyAppointmentReminder, setNotifyAppointmentReminder] = useState(true);
  const [notifyBookingConfirmation, setNotifyBookingConfirmation] = useState(true);
  const [notifyCancellation, setNotifyCancellation] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(false);
  const [hasStripeWebhookSecret, setHasStripeWebhookSecret] = useState(false);
  const [hasStripeSecretKey, setHasStripeSecretKey] = useState(false);

  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState<string | null>(null);

  async function loadSalon() {
    setLoading(true);
    setErrorGeneral(null);

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
        setStripeEnabled(Boolean(salon.stripeEnabled));
        setHasStripeWebhookSecret(Boolean(salon.hasStripeWebhookSecret));
        setHasStripeSecretKey(Boolean(salon.hasStripeSecretKey));
        setNotifyAppointmentReminder(Boolean(salon.notifyAppointmentReminder));
        setNotifyBookingConfirmation(Boolean(salon.notifyBookingConfirmation));
        setNotifyCancellation(Boolean(salon.notifyCancellation));
        setNotifyDailySummary(Boolean(salon.notifyDailySummary));
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

  function buildBusinessHoursPayload() {
    return schedule.flatMap((day) => [
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
  }

  function buildSalonPayload() {
    return {
      name: name.trim(),
      slug: slug.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      currency,
      timezone: timezone.trim(),
      slotIntervalMin: Number(slotIntervalMin || 30),
      stripeEnabled,
      notifyAppointmentReminder,
      notifyBookingConfirmation,
      notifyCancellation,
      notifyDailySummary,
      businessHours: buildBusinessHoursPayload(),
    };
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
      setErrorGeneral("El intervalo entre slots debe ser mayor que 0.");
      return;
    }

    try {
      setSavingGeneral(true);

      await apiPatch("/api/salons", buildSalonPayload());

      setSuccessGeneral("Cambios guardados correctamente.");
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

      await apiPatch("/api/salons", buildSalonPayload());

      setSuccessSchedule("Horarios guardados correctamente.");
      await loadSalon();
    } catch {
      setErrorSchedule("No se pudieron guardar los horarios.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleSaveStripeConfig() {
    setStripeError(null);
    setStripeSuccess(null);

    try {
      setSavingStripe(true);

      await apiPatch("/api/salons", {
        ...buildSalonPayload(),
        stripeWebhookSecret: stripeWebhookSecret.trim() || "",
        stripeSecretKey: stripeSecretKey.trim() || "",
      });

      setStripeWebhookSecret("");
      setStripeSecretKey("");
      setStripeModalOpen(false);
      setStripeSuccess("Configuración de Stripe guardada.");
      await loadSalon();
    } catch {
      setStripeError("No se pudo guardar la configuración de Stripe.");
    } finally {
      setSavingStripe(false);
    }
  }

  async function handleSaveNotifications() {
    setErrorNotifications(null);
    setSuccessNotifications(null);

    try {
      setSavingNotifications(true);
      await apiPatch("/api/salons", buildSalonPayload());
      setSuccessNotifications("Notificaciones guardadas correctamente.");
      await loadSalon();
    } catch {
      setErrorNotifications("No se pudieron guardar las notificaciones.");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleResetSalon() {
    setResetError(null);
    try {
      setResettingSalon(true);
      await apiPost("/api/salons/reset", {});
      setConfirmReset(false);
      await loadSalon();
    } catch {
      setResetError("No se pudieron borrar los datos del salón.");
    } finally {
      setResettingSalon(false);
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

                    <div className="rounded-lg border p-4 space-y-4 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <CreditCard className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Pagos con Stripe</p>
                          <p className="text-xs text-muted-foreground">
                            Activa pagos online por enlace para este salón.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm">Habilitar pagos con Stripe</span>
                        <Switch checked={stripeEnabled} onCheckedChange={setStripeEnabled} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setStripeError(null);
                            setStripeSuccess(null);
                            setStripeModalOpen(true);
                          }}
                        >
                          Configurar Stripe
                        </Button>

                        <span className="text-xs text-muted-foreground">
                          Webhook: {hasStripeWebhookSecret ? "configurado" : "pendiente"} · Secret key: {hasStripeSecretKey ? "configurada" : "pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {errorGeneral ? <p className="text-sm text-red-600">{errorGeneral}</p> : null}
                  {successGeneral ? <p className="text-sm text-green-600">{successGeneral}</p> : null}

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
                  {resetError ? <p className="mt-3 text-sm text-red-600">{resetError}</p> : null}
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
                {successSchedule ? <p className="text-sm text-green-600">{successSchedule}</p> : null}

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
                    <CardDescription>Se guardan en base de datos y se exponen en el webhook get_salon_data.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Recordatorio de cita</p>
                    <p className="text-xs text-muted-foreground">Enviar recordatorio 24h antes de la cita</p>
                  </div>
                  <Switch checked={notifyAppointmentReminder} onCheckedChange={setNotifyAppointmentReminder} />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Confirmación de reserva</p>
                    <p className="text-xs text-muted-foreground">Enviar confirmación al crear una cita</p>
                  </div>
                  <Switch checked={notifyBookingConfirmation} onCheckedChange={setNotifyBookingConfirmation} />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Notificación de cancelación</p>
                    <p className="text-xs text-muted-foreground">Avisar al cliente cuando se cancela una cita</p>
                  </div>
                  <Switch checked={notifyCancellation} onCheckedChange={setNotifyCancellation} />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Resumen diario</p>
                    <p className="text-xs text-muted-foreground">Enviar resumen de citas del día al equipo</p>
                  </div>
                  <Switch checked={notifyDailySummary} onCheckedChange={setNotifyDailySummary} />
                </div>

                {errorNotifications ? <p className="text-sm text-red-600">{errorNotifications}</p> : null}
                {successNotifications ? <p className="text-sm text-green-600">{successNotifications}</p> : null}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleSaveNotifications} disabled={savingNotifications}>
                    {savingNotifications ? "Guardando..." : "Guardar notificaciones"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={stripeModalOpen} onOpenChange={setStripeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Stripe</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripeWebhookSecret">Stripe webhook secret</Label>
              <Input
                id="stripeWebhookSecret"
                type="password"
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder={hasStripeWebhookSecret ? "Ya configurado" : "whsec_..."}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeSecretKey">Stripe secret key</Label>
              <Input
                id="stripeSecretKey"
                type="password"
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder={hasStripeSecretKey ? "Ya configurada" : "sk_live_... o sk_test_..."}
              />
            </div>

            {stripeError ? <p className="text-sm text-red-600">{stripeError}</p> : null}
            {stripeSuccess ? <p className="text-sm text-green-600">{stripeSuccess}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStripeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveStripeConfig} disabled={savingStripe}>
              {savingStripe ? "Guardando..." : "Guardar Stripe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Resetear datos del salón?"
        description="Esta acción es irreversible y eliminará todas las citas y datos asociados."
        confirmLabel={resettingSalon ? "Reseteando..." : "Sí, resetear"}
        onConfirm={handleResetSalon}
        variant="destructive"
      />
    </>
  );
}
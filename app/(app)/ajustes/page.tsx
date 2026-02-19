"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Store, Bell, Clock, Shield } from "lucide-react"

export default function AjustesPage() {
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <AppHeader title="Ajustes" description="Configuracion del salon" />
      <main className="p-4 lg:p-6 max-w-3xl">
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
                      <CardTitle className="text-base">Informacion del salon</CardTitle>
                      <CardDescription>Datos basicos de tu peluqueria</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label>Nombre del salon</Label>
                    <Input defaultValue="Salon Central" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Direccion</Label>
                    <Input defaultValue="Calle Mayor 12, Madrid" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Telefono</Label>
                      <Input defaultValue="+34 911 234 567" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Email</Label>
                      <Input defaultValue="info@saloncentral.es" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Moneda</Label>
                    <Select defaultValue="eur">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eur">Euro (€)</SelectItem>
                        <SelectItem value="usd">Dolar ($)</SelectItem>
                        <SelectItem value="gbp">Libra (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button>Guardar cambios</Button>
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
                        Elimina todas las citas y datos del salon
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
                    <CardTitle className="text-base">Horario de apertura</CardTitle>
                    <CardDescription>Define los horarios del salon</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {[
                  { day: "Lunes", open: "09:00", close: "19:00", active: true },
                  { day: "Martes", open: "09:00", close: "19:00", active: true },
                  { day: "Miercoles", open: "09:00", close: "19:00", active: true },
                  { day: "Jueves", open: "09:00", close: "19:00", active: true },
                  { day: "Viernes", open: "09:00", close: "20:00", active: true },
                  { day: "Sabado", open: "09:00", close: "14:00", active: true },
                  { day: "Domingo", open: "", close: "", active: false },
                ].map((schedule) => (
                  <div key={schedule.day} className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                      <span className="text-sm font-medium text-foreground">{schedule.day}</span>
                    </div>
                    <Switch defaultChecked={schedule.active} />
                    {schedule.active ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          defaultValue={schedule.open}
                          className="w-[110px]"
                        />
                        <span className="text-sm text-muted-foreground">a</span>
                        <Input
                          type="time"
                          defaultValue={schedule.close}
                          className="w-[110px]"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>
                ))}
                <Separator />
                <div className="flex flex-col gap-2">
                  <Label>Intervalo de citas (minutos)</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button>Guardar horarios</Button>
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
                    <CardDescription>Configura como se notifica a los clientes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {[
                  {
                    title: "Recordatorio de cita",
                    desc: "Enviar recordatorio 24h antes de la cita",
                    defaultOn: true,
                  },
                  {
                    title: "Confirmacion de reserva",
                    desc: "Enviar confirmacion al crear una cita",
                    defaultOn: true,
                  },
                  {
                    title: "Notificacion de cancelacion",
                    desc: "Avisar al cliente cuando se cancela una cita",
                    defaultOn: true,
                  },
                  {
                    title: "Resumen diario",
                    desc: "Enviar resumen de citas del dia al equipo",
                    defaultOn: false,
                  },
                  {
                    title: "Promociones",
                    desc: "Enviar ofertas y promociones a los clientes",
                    defaultOn: false,
                  },
                ].map((notif) => (
                  <div key={notif.title} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.desc}</p>
                    </div>
                    <Switch defaultChecked={notif.defaultOn} />
                  </div>
                ))}
                <Separator />
                <div className="flex justify-end">
                  <Button>Guardar notificaciones</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Resetear todos los datos"
        description="Esta accion es irreversible. Se eliminaran todas las citas, clientes y datos del salon. Estas seguro?"
        confirmLabel="Si, resetear todo"
        onConfirm={() => setConfirmReset(false)}
        variant="destructive"
      />
    </>
  )
}

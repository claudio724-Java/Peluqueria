"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppointmentStatusBadge } from "@/components/appointment-status-badge"
import { citas } from "@/lib/mock-data"
import { Clock } from "lucide-react"

export function TodayAppointments() {
  const todayCitas = citas.filter((c) => c.fecha === "2026-02-19")

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Citas de hoy</CardTitle>
          <span className="text-xs font-medium text-muted-foreground">
            {todayCitas.length} citas
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {todayCitas.map((cita) => (
            <div key={cita.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-sm font-semibold text-foreground">{cita.hora}</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {cita.duracion}min
                </span>
              </div>
              <div
                className="w-0.5 h-10 rounded-full shrink-0"
                style={{ backgroundColor: cita.empleado.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {cita.cliente.nombre}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {cita.servicio.nombre} - {cita.empleado.nombre}
                </p>
              </div>
              <AppointmentStatusBadge status={cita.estado} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

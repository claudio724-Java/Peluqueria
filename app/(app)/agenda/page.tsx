"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AppointmentStatusBadge } from "@/components/appointment-status-badge"
import { apiGet } from "@/lib/client-api"
import { mapAppointmentToCita } from "@/lib/mappers"
import type { Cita } from "@/lib/types"

type ApiAppointmentsResponse = { ok: true; items: any[] }
type ApiStaffResponse = { ok: true; items: any[] }

const hours = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","14:00","14:30","15:00",
  "15:30","16:00","16:30","17:00","17:30","18:00",
  "18:30","19:00",
]

// strip semanal: Lun–Sab, calculado desde la fecha seleccionada
function buildWeekDates(baseDateISO: string) {
  const base = new Date(`${baseDateISO}T00:00:00`)
  const day = base.getDay() // 0 dom, 1 lun...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(base)
  monday.setDate(base.getDate() + diffToMonday)

  const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
  const out: { day: string; date: string; full: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    out.push({
      day: labels[i],
      date: String(d.getDate()),
      full: d.toISOString().slice(0, 10),
    })
  }
  return out
}

function startOfDayISO(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toISOString()
}
function endOfDayISO(dateISO: string) {
  return new Date(`${dateISO}T23:59:59.999`).toISOString()
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedEmpleado, setSelectedEmpleado] = useState<string | null>(null)

  const [appointments, setAppointments] = useState<Cita[]>([])
  const [staff, setStaff] = useState<{ id: string; nombre: string; color: string; activo: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  const dates = useMemo(() => buildWeekDates(selectedDate), [selectedDate])

  const activeEmpleados = useMemo(
    () => staff.filter((e) => e.activo),
    [staff]
  )

  async function loadDay(dateISO: string) {
    setLoading(true)
    const from = startOfDayISO(dateISO)
    const to = endOfDayISO(dateISO)

    const [a, s] = await Promise.all([
      apiGet<ApiAppointmentsResponse>(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      ),
      apiGet<ApiStaffResponse>(`/api/staff`),
    ])

    setAppointments((a.items ?? []).map(mapAppointmentToCita))

    setStaff(
      (s.items ?? []).map((x: any) => ({
        id: x.id,
        nombre: x.name ?? x.nombre ?? "Empleado",
        color: x.color ?? "#64748b",
        activo: (x.isActive ?? x.activo ?? true) === true,
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    loadDay(selectedDate).catch(() => setLoading(false))
  }, [selectedDate])

  const filteredCitas = useMemo(() => {
    return appointments.filter((c) => {
      const dateMatch = c.fecha === selectedDate
      const empMatch = selectedEmpleado ? c.empleado.id === selectedEmpleado : true
      return dateMatch && empMatch
    })
  }, [appointments, selectedDate, selectedEmpleado])

  return (
    <>
      <AppHeader
        title="Agenda"
        description={loading ? "Cargando..." : "Vista diaria de citas"}
      />

      <main className="p-4 lg:p-6">
        {/* Date picker strip */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => {
                  const d = new Date(`${selectedDate}T00:00:00`)
                  d.setDate(d.getDate() - 7)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                {dates.map((d) => (
                  <button
                    key={d.full}
                    onClick={() => setSelectedDate(d.full)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg text-center min-w-[52px] transition-colors ${
                      selectedDate === d.full
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className="text-[11px] font-medium opacity-80">{d.day}</span>
                    <span className="text-lg font-bold leading-tight">{d.date}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => {
                  const d = new Date(`${selectedDate}T00:00:00`)
                  d.setDate(d.getDate() + 7)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <Button
            variant={selectedEmpleado === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedEmpleado(null)}
          >
            Todos
          </Button>

          {activeEmpleados.map((emp) => (
            <Button
              key={emp.id}
              variant={selectedEmpleado === emp.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedEmpleado(emp.id)}
              className="gap-2 shrink-0"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: emp.color }}
              />
              {emp.nombre.split(" ")[0]}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {hours.map((hour) => {
                const hourCitas = filteredCitas.filter((c) => c.hora === hour)
                return (
                  <div key={hour} className="flex min-h-[56px]">
                    <div className="w-16 shrink-0 flex items-start justify-end pr-3 pt-3 border-r border-border">
                      <span className="text-xs font-medium text-muted-foreground">{hour}</span>
                    </div>

                    <div className="flex-1 p-2 flex flex-col gap-1.5">
                      {hourCitas.map((cita) => (
                        <div
                          key={cita.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                          style={{
                            borderLeftColor: cita.empleado.color,
                            borderLeftWidth: "3px",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {cita.cliente.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {cita.servicio.nombre} ({cita.duracion}min) - {cita.empleado.nombre}
                            </p>
                          </div>

                          <span className="text-xs font-semibold text-foreground shrink-0">
                            {(cita.precio ?? 0)}€
                          </span>

                          <AppointmentStatusBadge status={cita.estado} />
                        </div>
                      ))}

                      {!loading && hourCitas.length === 0 ? null : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

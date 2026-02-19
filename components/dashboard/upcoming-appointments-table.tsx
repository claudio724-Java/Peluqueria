"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppointmentStatusBadge } from "@/components/appointment-status-badge"
import type { Cita } from "@/lib/types"
import {
  MoreHorizontal,
  Eye,
  CalendarClock,
  XCircle,
  CalendarDays,
} from "lucide-react"

interface UpcomingAppointmentsTableProps {
  appointments: Cita[]
}

// Generamos horas automáticamente
const horasDisponibles = Array.from({ length: 21 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2)
  const minutes = i % 2 === 0 ? "00" : "30"
  return `${hour.toString().padStart(2, "0")}:${minutes}`
})

export function UpcomingAppointmentsTable({
  appointments,
}: UpcomingAppointmentsTableProps) {
  const [viewCita, setViewCita] = useState<Cita | null>(null)
  const [cancelCita, setCancelCita] = useState<Cita | null>(null)
  const [reschedCita, setReschedCita] = useState<Cita | null>(null)
  const [reschedSuccess, setReschedSuccess] = useState(false)

  const activeCitas = appointments.filter(
    (c) => c.estado !== "cancelada" && c.estado !== "no_show"
  )

  function handleReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setReschedSuccess(true)
    setTimeout(() => {
      setReschedCita(null)
      setReschedSuccess(false)
    }, 1200)
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Próximas citas
            </CardTitle>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {activeCitas.length} citas
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeCitas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                No hay citas pendientes
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-[80px]">Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Servicio
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Empleado
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[60px] pr-6 text-right" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {activeCitas.map((cita) => (
                    <TableRow key={cita.id}>
                      <TableCell className="pl-6 font-mono text-sm font-semibold">
                        {cita.hora}
                      </TableCell>

                      <TableCell>
                        <p className="text-sm font-medium">
                          {cita.cliente.nombre}
                        </p>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        {cita.servicio.nombre}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {cita.empleado.nombre}
                      </TableCell>

                      <TableCell>
                        <AppointmentStatusBadge status={cita.estado} />
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewCita(cita)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setReschedCita(cita)}
                            >
                              <CalendarClock className="h-4 w-4" />
                              Reprogramar
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setCancelCita(cita)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Reprogramar ---- */}
      <Dialog
        open={!!reschedCita}
        onOpenChange={() => setReschedCita(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
            <DialogDescription>
              {reschedCita?.cliente.nombre}
            </DialogDescription>
          </DialogHeader>

          {reschedSuccess ? (
            <div className="text-center py-6">
              <CalendarClock className="mx-auto h-6 w-6 text-green-600" />
              <p className="mt-2">Cita reprogramada</p>
            </div>
          ) : (
            <form onSubmit={handleReschedule}>
              <div className="grid gap-4 py-2">
                <div>
                  <Label>Nueva fecha</Label>
                  <Input
                    type="date"
                    defaultValue={reschedCita?.fecha}
                    required
                  />
                </div>

                <div>
                  <Label>Nueva hora</Label>
                  <Select defaultValue={reschedCita?.hora}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {horasDisponibles.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Confirmar cambio</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

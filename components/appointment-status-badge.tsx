"use client"

import { Badge } from "@/components/ui/badge"
import type { AppointmentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const fallbackConfig = {
  label: "Pendiente",
  className: "bg-warning/15 text-warning-foreground border-warning/30",
}

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  confirmada: {
    label: "Confirmada",
    className: "bg-primary/10 text-primary border-primary/25",
  },
  en_curso: {
    label: "En curso",
    className: "bg-success/15 text-success border-success/30",
  },
  completada: {
    label: "Completada",
    className: "bg-success/15 text-success border-success/30",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
  no_show: {
    label: "No show",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
}

export function AppointmentStatusBadge({
  status,
}: {
  status?: AppointmentStatus | string | null
}) {
  const config =
    (status ? statusConfig[status as AppointmentStatus] : undefined) ?? fallbackConfig

  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  )
}
import type { AppointmentStatus, Cita, Cliente, Empleado, Servicio } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";


type ApiAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "NO_SHOW" | "COMPLETED";
  notes: string | null;
  customer: { id: string; name: string; phone: string; };
  service: { id: string; name: string; durationMin: number; priceCents: number; bufferMin: number; };
  staff: { id: string; name: string; } | null;
};

export function mapStatus(s: ApiAppointment["status"]): AppointmentStatus {
  switch (s) {
    case "PENDING":
      return "pendiente";
    case "CONFIRMED":
      return "confirmada";
    case "CANCELED":
      return "cancelada";
    case "NO_SHOW":
      return "no_show";
    case "COMPLETED":
      return "completada";
    default:
      return "pendiente";
  }
}

export function mapAppointmentToCita(a: ApiAppointment): Cita {
  const TZ = "Atlantic/Canary";

  const start = new Date(a.startAt);
  const end = new Date(a.endAt);

  const fecha = formatInTimeZone(start, TZ, "yyyy-MM-dd");
  const hora = formatInTimeZone(start, TZ, "HH:mm");

  const duracion = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  const cliente: Cliente = {
    id: a.customer.id,
    nombre: a.customer.name,
    email: "",
    telefono: a.customer.phone,
    notas: "",
    citas_totales: 0,
    ultima_visita: "",
    creado_en: "",
  };

  const servicio: Servicio = {
    id: a.service.id,
    nombre: a.service.name,
    duracion: a.service.durationMin,
    precio: Math.round(a.service.priceCents / 100),
    descripcion: "",
    categoria: "General",
    activo: true,
  };

  const empleado: Empleado = {
    id: a.staff?.id ?? "sin-empleado",
    nombre: a.staff?.name ?? "Sin asignar",
    especialidad: "",
    telefono: "",
    email: "",
    horario: [],
    activo: true,
  };


  return {
    id: a.id,
    cliente,
    servicio,
    empleado,
    fecha,
    hora,
    duracion,
    estado: mapStatus(a.status),
    notas: a.notes ?? "",
    precio: Math.round(a.service.priceCents / 100),
  };
}

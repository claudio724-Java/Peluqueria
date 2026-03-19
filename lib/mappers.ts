import type { AppointmentStatus, Cita, Cliente, Empleado, PagoCita, Servicio } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";

type ApiPayment = {
  id: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELED";
  amountCents: number;
  currency: string;
  providerCheckoutUrl: string | null;
  paidAt: string | null;
};

type ApiAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "NO_SHOW" | "COMPLETED";
  notes: string | null;
  customer: { id: string; name: string; phone: string };
  service: { id: string; name: string; durationMin: number; priceCents: number; bufferMin: number };
  staff: { id: string; name: string } | null;
  payments?: ApiPayment[];
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

function mapPaymentStatus(status: ApiPayment["status"]): PagoCita["estado"] {
  switch (status) {
    case "PAID":
      return "pagado";
    case "EXPIRED":
      return "caducado";
    case "FAILED":
      return "fallido";
    case "CANCELED":
      return "cancelado";
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

  const duracion = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

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
    telefono: "",
    email: "",
    rol: "",
    especialidad: "",
    horario: [],
    activo: true,
  };

  const latestPayment = a.payments?.[0];
  const pago: PagoCita | null = latestPayment
    ? {
        id: latestPayment.id,
        estado: mapPaymentStatus(latestPayment.status),
        importe: Math.round(latestPayment.amountCents / 100),
        moneda: latestPayment.currency,
        urlCheckout: latestPayment.providerCheckoutUrl ?? undefined,
        pagadoEn: latestPayment.paidAt ?? undefined,
      }
    : null;

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
    pago,
  };
}

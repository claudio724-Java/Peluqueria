export type AppointmentStatus =
  | "pendiente"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "no_show";

export type PaymentStatusEs = "pendiente" | "pagado" | "caducado" | "fallido" | "cancelado";

export interface Peluqueria {
  id: string;
  nombre: string;
  direccion: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  notas: string;
  citas_totales: number;
  ultima_visita: string;
  creado_en: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  duracion: number; // minutos
  precio: number;
  categoria: string;
  activo: boolean;
  descripcion?: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
  color?: string;
  avatar?: string;
  especialidad?: string;
  horario?: string[];
  activo: boolean;
}

export interface PagoCita {
  id: string;
  estado: PaymentStatusEs;
  importe: number;
  moneda: string;
  urlCheckout?: string;
  pagadoEn?: string;
}

export interface Cita {
  id: string;
  cliente: Cliente;
  servicio: Servicio;
  empleado: Empleado;
  fecha: string;
  hora: string;
  duracion: number;
  estado: AppointmentStatus;
  notas: string;
  precio: number;
  pago?: PagoCita | null;
}

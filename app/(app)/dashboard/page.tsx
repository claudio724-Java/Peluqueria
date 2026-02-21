"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { UpcomingAppointmentsTable } from "@/components/dashboard/upcoming-appointments-table";
import { RecentCancellations } from "@/components/dashboard/recent-cancellations";
import { NewAppointmentDialog } from "@/components/dashboard/new-appointment-dialog";
import { CalendarCheck, CalendarPlus, DollarSign, Clock } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { mapAppointmentToCita } from "@/lib/mappers";
import type { Cita } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";

type ApiAppointmentsResponse = { ok: true; items: any[] };

const TZ = "Atlantic/Canary";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Cita[]>([]);
  
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const TZ = "Atlantic/Canary";

    const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

    const from = new Date(`${today}T00:00:00`).toISOString();
    const to = new Date(`${today}T23:59:59`).toISOString();

    const data = await apiGet<ApiAppointmentsResponse>(
      `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );

    setAppointments(data.items.map(mapAppointmentToCita));
    console.log("MAPPED:", data.items.map(mapAppointmentToCita));

    setLoading(false);
  }



  useEffect(() => {
    load();
  }, []);

  const {
    todayCount,
    tomorrowCount,
    estimatedRevenue,
    freeSlotsToday,
  } = useMemo(() => {
    const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const tomorrow = formatInTimeZone(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      TZ,
      "yyyy-MM-dd"
    );

    const todayAppointments = appointments.filter(
      (a) => a.fecha === today && a.estado !== "cancelada"
    );

    const tomorrowAppointments = appointments.filter(
      (a) => a.fecha === tomorrow && a.estado !== "cancelada"
    );

    const revenue = appointments
      .filter((a) => a.estado !== "cancelada")
      .reduce((sum, a) => sum + (a.precio ?? 0), 0);

    const free = Math.max(0, 16 - todayAppointments.length);

    return {
      todayCount: todayAppointments.length,
      tomorrowCount: tomorrowAppointments.length,
      estimatedRevenue: revenue,
      freeSlotsToday: free,
    };
  }, [appointments]);

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Dashboard"
        subtitle={loading ? "Cargando..." : "Resumen de tu peluquería"}
        action={<NewAppointmentDialog onCreated={load} />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Citas hoy"
          value={todayCount.toString()}
          icon={CalendarCheck}
        />
        <MetricCard
          title="Citas mañana"
          value={tomorrowCount.toString()}
          icon={CalendarPlus}
        />
        <MetricCard
          title="Ingresos estimados"
          value={`€${estimatedRevenue}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Huecos libres hoy"
          value={freeSlotsToday.toString()}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingAppointmentsTable
            appointments={appointments.slice(0, 10)}
          />
        </div>

        <RecentCancellations
          cancellations={appointments.filter(
            (a) => a.estado === "cancelada"
          )}
        />
      </div>
    </div>
  );
}

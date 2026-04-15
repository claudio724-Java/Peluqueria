import { prisma } from "@/lib/prisma";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

export async function getAvailability(params: {
  salonId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}) {
  const { salonId, serviceId, date, staffId } = params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { businessHours: true },
  });

  if (!salon) return [];

  const timezone = salon.timezone || "Atlantic/Canary";

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId, isActive: true },
  });

  if (!service) return [];

  const totalDurationMin = service.durationMin + (service.bufferMin ?? 0);
  const stepMin = salon.slotIntervalMin ?? 30;

  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const salonWindows = salon.businessHours
    .filter((h) => h.dayOfWeek === dayOfWeek && h.isOpen)
    .map((h) => ({
      startMin: h.startMin!,
      endMin: h.endMin!,
    }));

  if (!salonWindows.length) return [];

  const staffList = await prisma.staff.findMany({
    where: {
      salonId,
      isActive: true,
      ...(staffId ? { id: staffId } : {}),
    },
    select: { id: true },
  });

  if (!staffList.length) return [];

  const staffIds = staffList.map((s) => s.id);

  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId: { in: staffIds }, dayOfWeek },
  });

  if (!schedules.length) return [];

  // Día completo en UTC, partiendo del día local del salón
  const dayStartUtc = fromZonedTime(`${date} 00:00:00`, timezone);
  const dayEndUtc = fromZonedTime(`${date} 23:59:59`, timezone);

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      staffId: { in: staffIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
    select: {
      staffId: true,
      startAt: true,
      endAt: true,
    },
  });

  const slots: string[] = [];
  const seen = new Set<string>();

  for (const schedule of schedules) {
    for (
      let t = schedule.startMin;
      t + totalDurationMin <= schedule.endMin;
      t += stepMin
    ) {
      const insideSalonWindow = salonWindows.some(
        (w) => t >= w.startMin && t + totalDurationMin <= w.endMin
      );

      if (!insideSalonWindow) continue;

      const hh = Math.floor(t / 60).toString().padStart(2, "0");
      const mm = (t % 60).toString().padStart(2, "0");

      // Hora local del salón -> UTC real
      const slotStartUtc = fromZonedTime(`${date} ${hh}:${mm}:00`, timezone);
      const slotEndUtc = new Date(
        slotStartUtc.getTime() + totalDurationMin * 60 * 1000
      );

      const hasConflict = appointments.some((appt) => {
        return (
          appt.staffId === schedule.staffId &&
          appt.startAt < slotEndUtc &&
          appt.endAt > slotStartUtc
        );
      });

      if (hasConflict) continue;

      // Devolver SIEMPRE en hora local del salón
      const localIso = formatInTimeZone(
        slotStartUtc,
        timezone,
        "yyyy-MM-dd'T'HH:mm:ss"
      );

      if (!seen.has(localIso)) {
        seen.add(localIso);
        slots.push(localIso);
      }
    }
  }

  return slots.sort();
}
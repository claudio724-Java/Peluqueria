import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

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

  const slots: string[] = [];

  for (const s of schedules) {
    for (let t = s.startMin; t + totalDurationMin <= s.endMin; t += stepMin) {
      const insideSalonWindow = salonWindows.some(
        (w) => t >= w.startMin && t + totalDurationMin <= w.endMin
      );

      if (!insideSalonWindow) continue;

      const h = Math.floor(t / 60)
        .toString()
        .padStart(2, "0");
      const min = (t % 60).toString().padStart(2, "0");

      const startUtc = fromZonedTime(`${date} ${h}:${min}:00`, timezone);

      slots.push(startUtc.toISOString());
    }
  }

  return slots;
}
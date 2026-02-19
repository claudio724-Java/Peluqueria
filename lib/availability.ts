import { prisma } from "@/lib/prisma";

function minsToMs(mins: number) {
  return mins * 60 * 1000;
}

export type Slot = { startAt: string; endAt: string; staffId: string };

/**
 * MVP availability: treats `date` as YYYY-MM-DD in UTC.
 * In production, convert using salon timezone.
 */
export async function getAvailability(params: {
  salonId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string;
}): Promise<Slot[]> {
  const { salonId, serviceId, date, staffId } = params;

  const service = await prisma.service.findFirst({ where: { id: serviceId, salonId, isActive: true } });
  if (!service) return [];

  const durationMin = service.durationMin + (service.bufferMin ?? 0);

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const dayOfWeek = dayStart.getUTCDay();

  const staffList = await prisma.staff.findMany({
    where: { salonId, isActive: true, ...(staffId ? { id: staffId } : {}) },
    select: { id: true },
  });
  if (!staffList.length) return [];

  const staffIds = staffList.map((s) => s.id);

  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId: { in: staffIds }, dayOfWeek },
    select: { staffId: true, startMin: true, endMin: true },
  });

  const exceptions = await prisma.staffException.findMany({
    where: {
      staffId: { in: staffIds },
      date: { gte: dayStart, lte: dayEnd },
      isOff: true,
    },
    select: { staffId: true },
  });

  const offStaff = new Set(exceptions.map((e) => e.staffId));

  const appts = await prisma.appointment.findMany({
    where: {
      salonId,
      staffId: { in: staffIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: { staffId: true, startAt: true, endAt: true },
  });

  const apptsByStaff = new Map<string, { startAt: Date; endAt: Date }[]>();
  for (const a of appts) {
    const list = apptsByStaff.get(a.staffId) ?? [];
    list.push({ startAt: a.startAt, endAt: a.endAt });
    apptsByStaff.set(a.staffId, list);
  }

  const slots: Slot[] = [];

  // build 15-min slots within each schedule window
  const stepMin = 15;

  for (const s of schedules) {
    if (offStaff.has(s.staffId)) continue;

    const windowStart = new Date(dayStart.getTime() + minsToMs(s.startMin));
    const windowEnd = new Date(dayStart.getTime() + minsToMs(s.endMin));

    for (
      let t = windowStart.getTime();
      t + minsToMs(durationMin) <= windowEnd.getTime();
      t += minsToMs(stepMin)
    ) {
      const startAt = new Date(t);
      const endAt = new Date(t + minsToMs(durationMin));

      const busy = apptsByStaff.get(s.staffId) ?? [];
      const overlaps = busy.some((b) => startAt < b.endAt && endAt > b.startAt);
      if (!overlaps) {
        slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), staffId: s.staffId });
      }
    }
  }

  // Sort by time
  slots.sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));

  return slots;
}

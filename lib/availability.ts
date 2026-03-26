import { prisma } from "@/lib/prisma";

function minsToMs(mins: number) {
  return mins * 60 * 1000;
}

export type Slot = {
  startAt: string;
  endAt: string;
  staffId: string;
};

type MinuteWindow = {
  startMin: number;
  endMin: number;
};

function intersectWindows(a: MinuteWindow, b: MinuteWindow): MinuteWindow | null {
  const startMin = Math.max(a.startMin, b.startMin);
  const endMin = Math.min(a.endMin, b.endMin);

  if (startMin >= endMin) return null;
  return { startMin, endMin };
}

function buildDayRange(date: string) {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  return { dayStart, dayEnd };
}

export async function getAvailability(params: {
  salonId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string;
}): Promise<Slot[]> {
  const { salonId, serviceId, date, staffId } = params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      businessHours: true,
    },
  });

  if (!salon) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId, isActive: true },
  });

  if (!service) return [];

  const totalDurationMin = service.durationMin + (service.bufferMin ?? 0);
  const stepMin = salon.slotIntervalMin ?? 30;

  const { dayStart, dayEnd } = buildDayRange(date);
  const dayOfWeek = dayStart.getUTCDay();

  const salonWindows: MinuteWindow[] = salon.businessHours
    .filter(
      (h) =>
        h.dayOfWeek === dayOfWeek &&
        h.isOpen &&
        h.startMin !== null &&
        h.endMin !== null &&
        h.startMin < h.endMin
    )
    .map((h) => ({
      startMin: h.startMin as number,
      endMin: h.endMin as number,
    }))
    .sort((a, b) => a.startMin - b.startMin);

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
    where: {
      staffId: { in: staffIds },
      dayOfWeek,
    },
    select: {
      staffId: true,
      startMin: true,
      endMin: true,
    },
  });

  if (!schedules.length) return [];

  const exceptions = await prisma.staffException.findMany({
    where: {
      staffId: { in: staffIds },
      date: { gte: dayStart, lte: dayEnd },
      isOff: true,
    },
    select: { staffId: true },
  });

  const offStaff = new Set(exceptions.map((e) => e.staffId));

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      staffId: { in: staffIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: {
      staffId: true,
      startAt: true,
      endAt: true,
    },
  });

  const appointmentsByStaff = new Map<string, { startAt: Date; endAt: Date }[]>();

  for (const appointment of appointments) {
    const list = appointmentsByStaff.get(appointment.staffId) ?? [];
    list.push({
      startAt: appointment.startAt,
      endAt: appointment.endAt,
    });
    appointmentsByStaff.set(appointment.staffId, list);
  }

  const slots: Slot[] = [];

  for (const schedule of schedules) {
    if (offStaff.has(schedule.staffId)) continue;

    const staffWindow: MinuteWindow = {
      startMin: schedule.startMin,
      endMin: schedule.endMin,
    };

    const effectiveWindows = salonWindows
      .map((salonWindow) => intersectWindows(salonWindow, staffWindow))
      .filter((window): window is MinuteWindow => window !== null);

    if (!effectiveWindows.length) continue;

    const busy = appointmentsByStaff.get(schedule.staffId) ?? [];

    for (const window of effectiveWindows) {
      const windowStart = new Date(dayStart.getTime() + minsToMs(window.startMin));
      const windowEnd = new Date(dayStart.getTime() + minsToMs(window.endMin));

      for (
        let t = windowStart.getTime();
        t + minsToMs(totalDurationMin) <= windowEnd.getTime();
        t += minsToMs(stepMin)
      ) {
        const startAt = new Date(t);
        const endAt = new Date(t + minsToMs(totalDurationMin));

        const overlaps = busy.some((b) => startAt < b.endAt && endAt > b.startAt);
        if (overlaps) continue;

        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          staffId: schedule.staffId,
        });
      }
    }
  }

  slots.sort((a, b) => {
    if (a.startAt < b.startAt) return -1;
    if (a.startAt > b.startAt) return 1;
    if (a.staffId < b.staffId) return -1;
    if (a.staffId > b.staffId) return 1;
    return 0;
  });

  return slots;
}
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

export type CalendarCellState = "FREE" | "BUSY" | "PARTIAL" | "CLOSED";

type MinuteWindow = {
  startMin: number;
  endMin: number;
};

type BusyBlock = {
  startAt: Date;
  endAt: Date;
};

export type WeeklyCalendarCell = {
  startMin: number;
  endMin: number;
  label: string;
  state: CalendarCellState;
  workingCount: number;
  busyCount: number;
};

export type WeeklyCalendarDay = {
  date: string;
  label: string;
  dayOfWeek: number;
  cells: WeeklyCalendarCell[];
};

export type WeeklyCalendarSnapshot = {
  salonId: string;
  salonName: string;
  timezone: string;
  staffId?: string;
  staffName?: string;
  weekStart: string;
  weekEnd: string;
  slotIntervalMin: number;
  visualStartMin: number;
  visualEndMin: number;
  timeLabels: string[];
  days: WeeklyCalendarDay[];
  summary: {
    free: number;
    busy: number;
    partial: number;
    closed: number;
  };
};

function addDaysToDateString(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeekFromDateString(dateStr: string) {
  return new Date(`${dateStr}T12:00:00.000Z`).getUTCDay(); // 0..6
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHmm(min: number) {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function makeLocalDate(dateStr: string, minutes: number, timezone: string) {
  return fromZonedTime(`${dateStr}T${minToHHmm(minutes)}:00`, timezone);
}

function makeDayStart(dateStr: string, timezone: string) {
  return fromZonedTime(`${dateStr}T00:00:00`, timezone);
}

function makeDayEnd(dateStr: string, timezone: string) {
  return fromZonedTime(`${dateStr}T23:59:59.999`, timezone);
}

function intersectWindows(a: MinuteWindow, b: MinuteWindow): MinuteWindow | null {
  const startMin = Math.max(a.startMin, b.startMin);
  const endMin = Math.min(a.endMin, b.endMin);
  if (startMin >= endMin) return null;
  return { startMin, endMin };
}

function fitsWindow(slotStart: number, slotEnd: number, window: MinuteWindow) {
  return slotStart >= window.startMin && slotEnd <= window.endMin;
}

function overlapsAppointment(
  dateStr: string,
  slotStartMin: number,
  slotEndMin: number,
  timezone: string,
  appointment: BusyBlock
) {
  const slotStart = makeLocalDate(dateStr, slotStartMin, timezone);
  const slotEnd = makeLocalDate(dateStr, slotEndMin, timezone);
  return slotStart < appointment.endAt && slotEnd > appointment.startAt;
}

function formatDayLabel(dateStr: string, timezone: string) {
  const d = fromZonedTime(`${dateStr}T12:00:00`, timezone);
  const formatted = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(d);

  return formatted
    .replace(",", "")
    .replace(/\.$/, "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export async function getWeeklyCalendarSnapshot(params: {
  salonId: string;
  weekStart: string; // YYYY-MM-DD
  staffId?: string;
}): Promise<WeeklyCalendarSnapshot> {
  const { salonId, weekStart, staffId } = params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      businessHours: true,
      staff: {
        where: {
          isActive: true,
          ...(staffId ? { id: staffId } : {}),
        },
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!salon) {
    throw new Error("Salon not found");
  }

  if (!salon.staff.length) {
    throw new Error("No hay personal activo para generar el calendario");
  }

  const timezone = salon.timezone || "Atlantic/Canary";
  const slotIntervalMin = Math.max(5, salon.slotIntervalMin || 30);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));
  const weekEnd = weekDates[6];
  const staffIds = salon.staff.map((s) => s.id);

  const weekStartUtc = makeDayStart(weekStart, timezone);
  const weekEndUtc = makeDayEnd(weekEnd, timezone);

  const schedules = await prisma.staffSchedule.findMany({
    where: {
      staffId: { in: staffIds },
    },
    select: {
      staffId: true,
      dayOfWeek: true,
      startMin: true,
      endMin: true,
    },
  });

  const exceptions = await prisma.staffException.findMany({
    where: {
      staffId: { in: staffIds },
      date: {
        gte: weekStartUtc,
        lte: weekEndUtc,
      },
      isOff: true,
    },
    select: {
      staffId: true,
      date: true,
    },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      staffId: { in: staffIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: weekEndUtc },
      endAt: { gt: weekStartUtc },
    },
    select: {
      staffId: true,
      startAt: true,
      endAt: true,
    },
  });

  const schedulesByStaffDay = new Map<string, MinuteWindow[]>();
  for (const row of schedules) {
    const key = `${row.staffId}:${row.dayOfWeek}`;
    const list = schedulesByStaffDay.get(key) ?? [];
    list.push({ startMin: row.startMin, endMin: row.endMin });
    schedulesByStaffDay.set(key, list);
  }

  const offSet = new Set<string>();
  for (const row of exceptions) {
    const dayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(row.date);
    offSet.add(`${row.staffId}:${dayStr}`);
  }

  const appointmentsByStaff = new Map<string, BusyBlock[]>();
  for (const row of appointments) {
    const list = appointmentsByStaff.get(row.staffId) ?? [];
    list.push({
      startAt: row.startAt,
      endAt: row.endAt,
    });
    appointmentsByStaff.set(row.staffId, list);
  }

  const openBusinessHours = salon.businessHours.filter(
    (h) =>
      h.isOpen &&
      h.startMin !== null &&
      h.endMin !== null &&
      h.startMin < h.endMin
  );

  const visualStartMin = openBusinessHours.length
    ? Math.min(...openBusinessHours.map((h) => h.startMin as number))
    : 9 * 60;

  const visualEndMin = openBusinessHours.length
    ? Math.max(...openBusinessHours.map((h) => h.endMin as number))
    : 19 * 60;

  const timeLabels: string[] = [];
  for (let min = visualStartMin; min < visualEndMin; min += slotIntervalMin) {
    timeLabels.push(minToHHmm(min));
  }

  const summary = {
    free: 0,
    busy: 0,
    partial: 0,
    closed: 0,
  };

  const days: WeeklyCalendarDay[] = weekDates.map((dateStr) => {
    const dayOfWeek = dayOfWeekFromDateString(dateStr);

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

    const cells: WeeklyCalendarCell[] = [];

    for (
      let slotStartMin = visualStartMin;
      slotStartMin < visualEndMin;
      slotStartMin += slotIntervalMin
    ) {
      const slotEndMin = slotStartMin + slotIntervalMin;

      let workingCount = 0;
      let busyCount = 0;

      for (const staff of salon.staff) {
        if (offSet.has(`${staff.id}:${dateStr}`)) {
          continue;
        }

        const rawStaffWindows = schedulesByStaffDay.get(`${staff.id}:${dayOfWeek}`) ?? [];
        if (!rawStaffWindows.length || !salonWindows.length) {
          continue;
        }

        const effectiveWindows = rawStaffWindows
          .flatMap((sw) =>
            salonWindows
              .map((bw) => intersectWindows(sw, bw))
              .filter((w): w is MinuteWindow => w !== null)
          );

        const isWorkingThisSlot = effectiveWindows.some((w) =>
          fitsWindow(slotStartMin, slotEndMin, w)
        );

        if (!isWorkingThisSlot) {
          continue;
        }

        workingCount += 1;

        const busyBlocks = appointmentsByStaff.get(staff.id) ?? [];
        const isBusy = busyBlocks.some((appt) =>
          overlapsAppointment(dateStr, slotStartMin, slotEndMin, timezone, appt)
        );

        if (isBusy) {
          busyCount += 1;
        }
      }

      let state: CalendarCellState = "CLOSED";
      if (workingCount === 0) {
        state = "CLOSED";
        summary.closed += 1;
      } else if (busyCount === 0) {
        state = "FREE";
        summary.free += 1;
      } else if (busyCount === workingCount) {
        state = "BUSY";
        summary.busy += 1;
      } else {
        state = "PARTIAL";
        summary.partial += 1;
      }

      cells.push({
        startMin: slotStartMin,
        endMin: slotEndMin,
        label: minToHHmm(slotStartMin),
        state,
        workingCount,
        busyCount,
      });
    }

    return {
      date: dateStr,
      label: formatDayLabel(dateStr, timezone),
      dayOfWeek,
      cells,
    };
  });

  return {
    salonId,
    salonName: salon.name,
    timezone,
    staffId,
    staffName: staffId ? salon.staff[0]?.name : undefined,
    weekStart,
    weekEnd,
    slotIntervalMin,
    visualStartMin,
    visualEndMin,
    timeLabels,
    days,
    summary,
  };
}
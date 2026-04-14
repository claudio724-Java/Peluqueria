import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

function normalizeDayOfWeek(value: number) {
  if (value >= 0 && value <= 6) return value;
  if (value === 7) return 0;
  return value;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER" || !session.user.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const staff = await prisma.staff.findFirst({
    where: {
      id,
      salonId: session.user.salonId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId: staff.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
  });

  const normalizedSchedules = schedules.map((schedule) => ({
    ...schedule,
    dayOfWeek: normalizeDayOfWeek(schedule.dayOfWeek),
  }));

  return NextResponse.json({
    ok: true,
    staff: {
      ...staff,
      schedules: normalizedSchedules,
    },
    schedules: normalizedSchedules,
  });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "OWNER" || !session.user.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const schedules = Array.isArray(body?.schedules) ? body.schedules : [];

  const staff = await prisma.staff.findFirst({
    where: {
      id,
      salonId: session.user.salonId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const normalizedSchedules = schedules.map((s: any) => ({
    ...s,
    dayOfWeek: normalizeDayOfWeek(s.dayOfWeek),
  }));

  await prisma.staffSchedule.deleteMany({
    where: { staffId: staff.id },
  });

  if (normalizedSchedules.length > 0) {
    await prisma.staffSchedule.createMany({
      data: normalizedSchedules.map((s: any) => ({
        staffId: staff.id,
        dayOfWeek: s.dayOfWeek,
        startMin: s.startMin,
        endMin: s.endMin,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
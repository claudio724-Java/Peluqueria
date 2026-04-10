import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session?.user || session.user.role !== "OWNER" || !session.user.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const staff = await prisma.staff.findFirst({
    where: {
      id: params.id,
      salonId: session.user.salonId,
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId: staff.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
  });

  return NextResponse.json({ ok: true, schedules });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session?.user || session.user.role !== "OWNER" || !session.user.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const schedules = Array.isArray(body?.schedules) ? body.schedules : [];

  const staff = await prisma.staff.findFirst({
    where: {
      id: params.id,
      salonId: session.user.salonId,
    },
    select: { id: true },
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  for (const s of schedules) {
    if (
      typeof s.dayOfWeek !== "number" ||
      typeof s.startMin !== "number" ||
      typeof s.endMin !== "number"
    ) {
      return NextResponse.json({ error: "Invalid schedule payload" }, { status: 400 });
    }

    if (s.dayOfWeek < 1 || s.dayOfWeek > 7) {
      return NextResponse.json({ error: "dayOfWeek must be between 1 and 7" }, { status: 400 });
    }

    if (s.startMin < 0 || s.endMin > 1440 || s.startMin >= s.endMin) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    }
  }

  await prisma.staffSchedule.deleteMany({
    where: { staffId: staff.id },
  });

  if (schedules.length > 0) {
    await prisma.staffSchedule.createMany({
      data: schedules.map((s: any) => ({
        staffId: staff.id,
        dayOfWeek: s.dayOfWeek,
        startMin: s.startMin,
        endMin: s.endMin,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
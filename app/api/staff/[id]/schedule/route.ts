import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ id: string }>;
};

function isValidMinute(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1440;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  const { id } = await params;

  if (role !== "OWNER") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const staff = await prisma.staff.findFirst({
    where: { id, salonId },
    select: {
      id: true,
      name: true,
      schedules: {
        orderBy: { dayOfWeek: "asc" },
        select: {
          dayOfWeek: true,
          startMin: true,
          endMin: true,
        },
      },
    },
  });

  if (!staff) {
    return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, staff });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  const { id } = await params;

  if (role !== "OWNER") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const schedules = Array.isArray(body?.schedules) ? body.schedules : null;

  if (!schedules) {
    return NextResponse.json({ ok: false, error: "schedules is required" }, { status: 400 });
  }

  const staff = await prisma.staff.findFirst({
    where: { id, salonId },
    select: { id: true },
  });

  if (!staff) {
    return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });
  }

  for (const item of schedules) {
    if (
      typeof item?.dayOfWeek !== "number" ||
      !Number.isInteger(item.dayOfWeek) ||
      item.dayOfWeek < 0 ||
      item.dayOfWeek > 6 ||
      !isValidMinute(item.startMin) ||
      !isValidMinute(item.endMin) ||
      item.startMin >= item.endMin
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid schedule payload" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffSchedule.deleteMany({ where: { staffId: id } });

    if (schedules.length > 0) {
      await tx.staffSchedule.createMany({
        data: schedules.map((item) => ({
          staffId: id,
          dayOfWeek: item.dayOfWeek,
          startMin: item.startMin,
          endMin: item.endMin,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

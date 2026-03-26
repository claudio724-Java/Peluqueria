import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.staff.findFirst({
    where: { id, salonId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });
  }

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      name: String(body.name),
      role: body.role ? String(body.role) : null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const { id } = await params;

  const existing = await prisma.staff.findFirst({
    where: { id, salonId },
    include: {
      appointments: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });
  }

  if (existing.appointments.length > 0) {
    const disabled = await prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      ok: true,
      softDeleted: true,
      item: disabled,
    });
  }

  await prisma.staff.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
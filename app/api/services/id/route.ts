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

  if (!body?.name || !body?.durationMin || body?.priceCents === undefined) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.service.findFirst({
    where: { id, salonId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }

  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: String(body.name),
      durationMin: Number(body.durationMin),
      priceCents: Number(body.priceCents),
      bufferMin: 0,
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

  const existing = await prisma.service.findFirst({
    where: { id, salonId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }

  await prisma.service.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
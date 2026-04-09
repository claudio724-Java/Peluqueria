import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  if (role === "STAFF") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const items = await prisma.service.findMany({
    where: { salonId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  if (role === "STAFF") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.durationMin) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const created = await prisma.service.create({
    data: {
      salonId,
      name: String(body.name),
      durationMin: Number(body.durationMin),
      priceCents: Number(body.priceCents ?? 0),
      bufferMin: Number(body.bufferMin ?? 0),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;

  const items = await prisma.staff.findMany({
    where: { salonId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const created = await prisma.staff.create({
    data: {
      salonId,
      name: String(body.name),
      role: body.role ? String(body.role) : null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}


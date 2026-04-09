import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  if (role === "STAFF") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const items = await prisma.staff.findMany({
    where: { salonId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      user: {
        select: { id: true, email: true, isActive: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    items: items.map((item) => ({
      ...item,
      email: item.email ?? item.user?.email ?? null,
      hasAccount: Boolean(item.userId),
      accountActive: item.user?.isActive ?? null,
      user: undefined,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;

  if (role === "STAFF") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ ok: false, error: "name, email y password son obligatorios" }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password).trim();
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ese email ya existe" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        salonId,
        email,
        name: String(body.name).trim(),
        passwordHash,
        role: "STAFF",
        isActive: body.isActive ?? true,
      },
    });

    return tx.staff.create({
      data: {
        salonId,
        userId: user.id,
        name: String(body.name).trim(),
        email,
        phone: body.phone ? String(body.phone).trim() : null,
        role: body.role ? String(body.role).trim() : null,
        isActive: body.isActive ?? true,
      },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...created,
      email: created.email ?? created.user?.email ?? null,
      hasAccount: true,
      accountActive: created.user?.isActive ?? null,
      user: undefined,
    },
  }, { status: 201 });
}

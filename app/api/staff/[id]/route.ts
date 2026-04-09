import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (role === "STAFF") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  if (!body?.name || !body?.email) {
    return NextResponse.json({ ok: false, error: "name y email son obligatorios" }, { status: 400 });
  }

  const existing = await prisma.staff.findFirst({
    where: { id, salonId },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = typeof body.password === "string" ? body.password.trim() : "";

  const emailOwner = await prisma.user.findFirst({
    where: {
      email,
      NOT: existing.userId ? { id: existing.userId } : undefined,
    },
    select: { id: true },
  });

  if (emailOwner) {
    return NextResponse.json({ ok: false, error: "Ese email ya existe" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (existing.userId) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          email,
          name: String(body.name).trim(),
          isActive: body.isActive ?? true,
          ...(password
            ? { passwordHash: await bcrypt.hash(password, 10) }
            : {}),
        },
      });
    }

    return tx.staff.update({
      where: { id },
      data: {
        name: String(body.name).trim(),
        email,
        phone: body.phone ? String(body.phone).trim() : null,
        role: body.role ? String(body.role).trim() : null,
        isActive: body.isActive ?? true,
      },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...updated,
      email: updated.email ?? updated.user?.email ?? null,
      hasAccount: Boolean(updated.userId),
      accountActive: updated.user?.isActive ?? null,
      user: undefined,
    },
  });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  const { id } = await params;

  if (role === "STAFF") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

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
    const disabled = await prisma.$transaction(async (tx) => {
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isActive: false },
        });
      }

      return tx.staff.update({
        where: { id },
        data: { isActive: false },
      });
    });

    return NextResponse.json({
      ok: true,
      softDeleted: true,
      item: disabled,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.staff.delete({ where: { id } });
    if (existing.userId) {
      await tx.user.delete({ where: { id: existing.userId } });
    }
  });

  return NextResponse.json({ ok: true, deleted: true });
}

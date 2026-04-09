import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";
import { UserRole } from "@prisma/client";

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    salonId: user.salonId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    salon: user.salon
      ? {
          id: user.salon.id,
          name: user.salon.name,
          slug: user.salon.slug,
        }
      : null,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(name: string, currentSalonId?: string | null) {
  const baseSlug = slugify(name) || `salon-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;

  while (true) {
    const existing = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === currentSalonId) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { response } = await requireManager();
  if (response) return response;

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const target = await prisma.user.findUnique({
    where: { id },
    include: { salon: { select: { id: true, name: true, slug: true } } },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const data: any = {};
  const salonData: any = {};

  if (typeof body?.email === "string") data.email = body.email.toLowerCase().trim();
  if (typeof body?.name === "string") data.name = body.name.trim() || null;
  if (typeof body?.role === "string") {
    const role = body.role.toUpperCase();
    if (Object.values(UserRole).includes(role as UserRole)) data.role = role;
  }
  if (typeof body?.password === "string" && body.password.trim()) {
    if (body.password.trim().length < 6) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    data.passwordHash = await bcrypt.hash(body.password.trim(), 10);
  }

  if (typeof body?.salonName === "string") {
    const salonName = body.salonName.trim();
    if (!salonName) {
      return NextResponse.json({ ok: false, error: "El nombre del salón es obligatorio" }, { status: 400 });
    }
    salonData.name = salonName;
    salonData.slug = await uniqueSlug(salonName, target.salonId);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(salonData).length && target.salonId) {
      await tx.salon.update({
        where: { id: target.salonId },
        data: salonData,
      });
    }

    return tx.user.update({
      where: { id },
      data,
      include: { salon: { select: { id: true, name: true, slug: true } } },
    });
  });

  return NextResponse.json({ ok: true, item: sanitizeUser(updated) });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireManager();
  if (response) return response;

  const { id } = await context.params;
  const currentUserId = (session!.user as any).id;

  if (id === currentUserId) {
    return NextResponse.json(
      { ok: false, error: "No puedes borrar tu propia cuenta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, salonId: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id } });

    if (target.salonId) {
      const remaining = await tx.user.count({ where: { salonId: target.salonId } });
      if (remaining === 0) {
        await tx.salon.delete({ where: { id: target.salonId } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

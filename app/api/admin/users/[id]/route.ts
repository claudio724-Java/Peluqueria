import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOwner, requireAdminSession } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

const allowedRoles = new Set(Object.values(UserRole));

async function ensureActiveOwnerCount(salonId: string) {
  return prisma.user.count({
    where: {
      salonId,
      role: UserRole.OWNER,
      isActive: true,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const currentUserId = (session!.user as any).id as string;
  const salonId = (session!.user as any).salonId as string;
  const requesterRole = (session!.user as any).role as string;
  const body = await req.json().catch(() => null);

  const existing = await prisma.user.findFirst({ where: { id, salonId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }

  if (existing.role === UserRole.OWNER && !isOwner(requesterRole)) {
    return NextResponse.json({ ok: false, error: "Solo el propietario puede modificar otra cuenta propietaria." }, { status: 403 });
  }

  const name = body?.name ? String(body.name).trim() : "";
  const email = body?.email ? String(body.email).toLowerCase().trim() : "";
  const nextRole = body?.role ? String(body.role) : existing.role;
  const nextActive = typeof body?.isActive === "boolean" ? body.isActive : existing.isActive;
  const password = body?.password ? String(body.password) : "";

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: "Nombre y email son obligatorios." }, { status: 400 });
  }

  if (!allowedRoles.has(nextRole as UserRole)) {
    return NextResponse.json({ ok: false, error: "Rol inválido." }, { status: 400 });
  }

  if (nextRole === UserRole.OWNER && !isOwner(requesterRole)) {
    return NextResponse.json({ ok: false, error: "Solo el propietario puede asignar el rol OWNER." }, { status: 403 });
  }

  if (password && password.length < 8) {
    return NextResponse.json({ ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const emailInUse = await prisma.user.findFirst({
    where: {
      email,
      id: { not: id },
    },
    select: { id: true },
  });

  if (emailInUse) {
    return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const wouldRemoveOwner = existing.role === UserRole.OWNER && (nextRole !== UserRole.OWNER || !nextActive);
  if (wouldRemoveOwner) {
    const activeOwners = await ensureActiveOwnerCount(salonId);
    if (activeOwners <= 1) {
      return NextResponse.json({ ok: false, error: "Debe existir al menos un propietario activo." }, { status: 400 });
    }
  }

  if (id === currentUserId && !nextActive) {
    return NextResponse.json({ ok: false, error: "No puedes suspender tu propia cuenta." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role: nextRole as UserRole,
      isActive: Boolean(nextActive),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const currentUserId = (session!.user as any).id as string;
  const salonId = (session!.user as any).salonId as string;
  const requesterRole = (session!.user as any).role as string;

  const existing = await prisma.user.findFirst({ where: { id, salonId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }

  if (id === currentUserId) {
    return NextResponse.json({ ok: false, error: "No puedes borrar tu propia cuenta." }, { status: 400 });
  }

  if (existing.role === UserRole.OWNER && !isOwner(requesterRole)) {
    return NextResponse.json({ ok: false, error: "Solo el propietario puede borrar otra cuenta propietaria." }, { status: 403 });
  }

  if (existing.role === UserRole.OWNER) {
    const activeOwners = await ensureActiveOwnerCount(salonId);
    if (existing.isActive && activeOwners <= 1) {
      return NextResponse.json({ ok: false, error: "Debe existir al menos un propietario activo." }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true, deleted: true });
}

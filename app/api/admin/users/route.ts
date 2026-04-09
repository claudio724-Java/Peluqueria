import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOwner, requireAdminSession } from "@/lib/permissions";

const allowedRoles = new Set(Object.values(UserRole));

function sanitizeUser(user: {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return user;
}

export async function GET() {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId as string;
  const requesterRole = (session!.user as any).role as string;

  const items = await prisma.user.findMany({
    where: {
      salonId,
      ...(isOwner(requesterRole) ? {} : { role: { not: UserRole.OWNER } }),
    },
    orderBy: [{ createdAt: "desc" }],
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

  return NextResponse.json({ ok: true, items: items.map(sanitizeUser) });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId as string;
  const requesterRole = (session!.user as any).role as string;
  const body = await req.json().catch(() => null);

  const name = body?.name ? String(body.name).trim() : "";
  const email = body?.email ? String(body.email).toLowerCase().trim() : "";
  const password = body?.password ? String(body.password) : "";
  const role = body?.role ? String(body.role) : "STAFF";
  const isActive = body?.isActive ?? true;

  if (!name || !email || !password) {
    return NextResponse.json({ ok: false, error: "Nombre, email y contraseña son obligatorios." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  if (!allowedRoles.has(role as UserRole)) {
    return NextResponse.json({ ok: false, error: "Rol inválido." }, { status: 400 });
  }

  if (role === UserRole.OWNER && !isOwner(requesterRole)) {
    return NextResponse.json({ ok: false, error: "Solo el propietario puede crear otros propietarios." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: {
      salonId,
      name,
      email,
      passwordHash,
      role: role as UserRole,
      isActive: Boolean(isActive),
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

  return NextResponse.json({ ok: true, item: sanitizeUser(created) }, { status: 201 });
}

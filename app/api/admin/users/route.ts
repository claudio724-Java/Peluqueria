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

export async function GET() {
  const { response } = await requireManager();
  if (response) return response;

  const items = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salon: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return NextResponse.json({ ok: true, items: items.map(sanitizeUser) });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireManager();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const salonNameRaw = typeof body?.salonName === "string" ? body.salonName.trim() : "";
  const roleInput = typeof body?.role === "string" ? body.role.toUpperCase() : "OWNER";
  const role = Object.values(UserRole).includes(roleInput as UserRole)
    ? (roleInput as UserRole)
    : UserRole.OWNER;

  if (!email || !password || !salonNameRaw) {
    return NextResponse.json(
      { ok: false, error: "email, password y salonName son obligatorios" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ ok: false, error: "El email ya existe" }, { status: 409 });
  }

  const baseSlug = slugify(salonNameRaw) || `salon-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;
  while (await prisma.salon.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      isActive: true,
      salon: {
        create: {
          name: salonNameRaw,
          slug,
          timezone: "Atlantic/Canary",
        },
      },
    },
    include: {
      salon: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return NextResponse.json(
    { ok: true, item: sanitizeUser(created), createdBy: (session!.user as any).id },
    { status: 201 }
  );
}

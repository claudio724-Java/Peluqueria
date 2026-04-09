import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";

export async function PATCH(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireManager();
  if (response) return response;

  const { id } = await context.params;
  const currentUserId = (session!.user as any).id;

  if (id === currentUserId) {
    return NextResponse.json(
      { ok: false, error: "No puedes suspender tu propia cuenta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { salon: { select: { id: true, name: true, slug: true } } },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive },
    include: { salon: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json({
    ok: true,
    item: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      salonId: updated.salonId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      salon: updated.salon,
    },
  });
}

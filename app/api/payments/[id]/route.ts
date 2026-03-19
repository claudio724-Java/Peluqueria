import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;
  const { id } = await ctx.params;
  if (!salonId) return jsonError("salonId missing on user/session", 400);

  const item = await prisma.payment.findFirst({
    where: { id, salonId },
    include: {
      appointment: {
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!item) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true, item });
}

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;

  if (!salonId) return Response.json({ ok: false, error: "salonId missing on user" }, { status: 400 });

  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  return Response.json({ ok: true, items: salon ? [salon] : [] });
}

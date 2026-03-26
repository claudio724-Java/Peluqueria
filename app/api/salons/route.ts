import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

type BusinessHourInput = {
  dayOfWeek: number;
  shift: "MORNING" | "AFTERNOON";
  isOpen: boolean;
  startMin: number | null;
  endMin: number | null;
};

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;

  if (!salonId) {
    return Response.json({ ok: false, error: "salonId missing on user" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: {
      businessHours: {
        orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }],
      },
    },
  });

  return Response.json({ ok: true, items: salon ? [salon] : [] });
}

export async function PATCH(req: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId;

  if (!salonId) {
    return Response.json({ ok: false, error: "salonId missing on user" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  if (!body?.name || !body?.slug || !body?.timezone) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const existingBySlug = await prisma.salon.findFirst({
    where: {
      slug: String(body.slug),
      NOT: { id: salonId },
    },
    select: { id: true },
  });

  if (existingBySlug) {
    return Response.json({ ok: false, error: "Slug already in use" }, { status: 409 });
  }

  const businessHours: BusinessHourInput[] = Array.isArray(body.businessHours)
    ? body.businessHours
    : [];

  const updated = await prisma.$transaction(async (tx) => {
    const salon = await tx.salon.update({
      where: { id: salonId },
      data: {
        name: String(body.name).trim(),
        slug: String(body.slug).trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        currency: body.currency ? String(body.currency).trim() : "EUR",
        timezone: String(body.timezone).trim(),
        slotIntervalMin: body.slotIntervalMin ? Number(body.slotIntervalMin) : 30,
      },
    });

    for (const item of businessHours) {
      await tx.salonBusinessHour.upsert({
        where: {
          salonId_dayOfWeek_shift: {
            salonId,
            dayOfWeek: Number(item.dayOfWeek),
            shift: item.shift,
          },
        },
        update: {
          isOpen: Boolean(item.isOpen),
          startMin: item.isOpen ? item.startMin : null,
          endMin: item.isOpen ? item.endMin : null,
        },
        create: {
          salonId,
          dayOfWeek: Number(item.dayOfWeek),
          shift: item.shift,
          isOpen: Boolean(item.isOpen),
          startMin: item.isOpen ? item.startMin : null,
          endMin: item.isOpen ? item.endMin : null,
        },
      });
    }

    return tx.salon.findUnique({
      where: { id: salonId },
      include: {
        businessHours: {
          orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }],
        },
      },
    });
  });

  return Response.json({ ok: true, item: updated });
}
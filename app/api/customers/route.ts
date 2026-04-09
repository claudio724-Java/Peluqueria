import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

function mapCustomer(item: any) {
  return {
    ...item,
    consentMessaging: item.consent,
  };
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  if (role === "STAFF") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const items = await prisma.customer.findMany({
    where: {
      salonId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, items: items.map(mapCustomer) });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const salonId = (session!.user as any).salonId;
  const role = (session!.user as any).role;
  if (role === "STAFF") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.phone) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const created = await prisma.customer.create({
    data: {
      salonId,
      name: String(body.name),
      phone: String(body.phone),
      notes: body.notes ? String(body.notes) : null,
      consent: Boolean(body.consentMessaging ?? body.consent ?? true),
    },
  });

  return NextResponse.json({ ok: true, item: mapCustomer(created) }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { AvailabilityQuerySchema } from "@/lib/validators/appointments";
import { getAvailability } from "@/lib/availability";
import { requireSession } from "@/lib/require-session";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);

  const parsed = AvailabilityQuerySchema.safeParse({
    salonId: searchParams.get("salonId"),
    serviceId: searchParams.get("serviceId"),
    staffId: searchParams.get("staffId") ?? undefined,
    date: searchParams.get("date"),
  });

  if (!parsed.success) return jsonError("Invalid query", 400, parsed.error.flatten());

  const slots = await getAvailability(parsed.data);
  return NextResponse.json({ ok: true, slots });
}

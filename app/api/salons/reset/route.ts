import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function POST() {
  const { session, response } = await requireSession();
  if (response) return response;

  const salonId = (session!.user as any).salonId as string | undefined;
  const role = (session!.user as any).role as string | undefined;

  if (!salonId) {
    return NextResponse.json({ ok: false, error: "salonId missing on user" }, { status: 400 });
  }

  if (role === "STAFF") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const employeeUsers = await prisma.user.findMany({
    where: { salonId, role: "STAFF" },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { salonId } });
    await tx.messageLog.deleteMany({ where: { salonId } });
    await tx.waitlistEntry.deleteMany({ where: { salonId } });
    await tx.appointment.deleteMany({ where: { salonId } });
    await tx.customer.deleteMany({ where: { salonId } });
    await tx.staffException.deleteMany({ where: { staff: { salonId } } });
    await tx.staffSchedule.deleteMany({ where: { staff: { salonId } } });
    await tx.service.deleteMany({ where: { salonId } });
    await tx.staff.deleteMany({ where: { salonId } });

    if (employeeUsers.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: employeeUsers.map((user) => user.id) } } });
    }

    return tx.salon.update({
      where: { id: salonId },
      data: {
        notifyAppointmentReminder: true,
        notifyBookingConfirmation: true,
        notifyCancellation: true,
        notifyDailySummary: false,
      },
      select: { id: true, name: true },
    });
  });

  return NextResponse.json({ ok: true, item: result });
}

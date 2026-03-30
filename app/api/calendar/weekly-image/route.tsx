import { ImageResponse } from "next/og";
import { getWeeklyCalendarSnapshot } from "@/lib/weekly-calendar";
import { verifyCalendarImage } from "@/lib/calendar-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CellState = "FREE" | "BUSY" | "PARTIAL" | "CLOSED";

function shortDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

function getFreeSlotsForDay(
  day: {
    label: string;
    cells: Array<{
      label: string;
      state: CellState;
    }>;
  },
  max = 4
) {
  return day.cells
    .filter((cell) => cell.state === "FREE")
    .slice(0, max)
    .map((cell) => cell.label);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const tiny = url.searchParams.get("tiny") === "1";

  try {
    const salonId = url.searchParams.get("salonId");
    const weekStart = url.searchParams.get("weekStart");
    const staffId = url.searchParams.get("staffId") || undefined;
    const expiresAt = url.searchParams.get("expiresAt");
    const signature = url.searchParams.get("signature");

    if (!salonId || !weekStart || !expiresAt || !signature) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing params" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ ok: false, error: "URL caducada" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const valid = verifyCalendarImage({
      salonId,
      weekStart,
      staffId,
      expiresAt,
      signature,
    });

    if (!valid) {
      return new Response(
        JSON.stringify({ ok: false, error: "Firma inválida" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const snapshot = await getWeeklyCalendarSnapshot({
      salonId,
      weekStart,
      staffId,
    });

    if (debug) {
      return new Response(
        JSON.stringify(
          {
            ok: true,
            debug: true,
            salonId,
            weekStart,
            staffId: staffId ?? null,
            timezone: snapshot.timezone,
            salonName: snapshot.salonName,
            staffName: snapshot.staffName ?? null,
            weekEnd: snapshot.weekEnd,
            summary: snapshot.summary,
            daysCount: snapshot.days?.length ?? 0,
            timeLabelsCount: snapshot.timeLabels?.length ?? 0,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (tiny) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "1200px",
              height: "630px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F8FAFC",
              color: "#0F172A",
              fontSize: 48,
              fontFamily: "sans-serif",
            }}
          >
            Agenda semanal {snapshot.salonName}
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const days = snapshot.days.slice(0, 7);

    const day1 = days[0];
    const day2 = days[1];
    const day3 = days[2];
    const day4 = days[3];
    const day5 = days[4];
    const day6 = days[5];
    const day7 = days[6];

    const d1 = day1 ? getFreeSlotsForDay(day1, 4).join(", ") || "sin huecos" : "-";
    const d2 = day2 ? getFreeSlotsForDay(day2, 4).join(", ") || "sin huecos" : "-";
    const d3 = day3 ? getFreeSlotsForDay(day3, 4).join(", ") || "sin huecos" : "-";
    const d4 = day4 ? getFreeSlotsForDay(day4, 4).join(", ") || "sin huecos" : "-";
    const d5 = day5 ? getFreeSlotsForDay(day5, 4).join(", ") || "sin huecos" : "-";
    const d6 = day6 ? getFreeSlotsForDay(day6, 4).join(", ") || "sin huecos" : "-";
    const d7 = day7 ? getFreeSlotsForDay(day7, 4).join(", ") || "sin huecos" : "-";

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "1200px",
            display: "flex",
            flexDirection: "column",
            background: "#F8FAFC",
            color: "#0F172A",
            fontFamily: "sans-serif",
            padding: "48px",
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            {snapshot.staffName
              ? `Agenda semanal - ${snapshot.staffName}`
              : "Agenda semanal - Vista global"}
          </div>

          <div
            style={{
              fontSize: 26,
              color: "#334155",
              marginBottom: "8px",
            }}
          >
            {snapshot.salonName}
          </div>

          <div
            style={{
              fontSize: 18,
              color: "#64748B",
              marginBottom: "24px",
            }}
          >
            Semana {shortDate(snapshot.weekStart)} - {shortDate(snapshot.weekEnd)} -{" "}
            {snapshot.timezone}
          </div>

          <div
            style={{
              fontSize: 20,
              marginBottom: "6px",
            }}
          >
            Libres: {snapshot.summary.free}
          </div>

          <div
            style={{
              fontSize: 20,
              marginBottom: "6px",
            }}
          >
            Parciales: {snapshot.summary.partial}
          </div>

          <div
            style={{
              fontSize: 20,
              marginBottom: "6px",
            }}
          >
            Ocupados: {snapshot.summary.busy}
          </div>

          <div
            style={{
              fontSize: 20,
              marginBottom: "28px",
            }}
          >
            Cerrados: {snapshot.summary.closed}
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              marginBottom: "18px",
            }}
          >
            Primeros huecos por día
          </div>

          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day1?.label ?? "Día 1"}: {d1}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day2?.label ?? "Día 2"}: {d2}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day3?.label ?? "Día 3"}: {d3}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day4?.label ?? "Día 4"}: {d4}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day5?.label ?? "Día 5"}: {d5}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day6?.label ?? "Día 6"}: {d6}
          </div>
          <div style={{ fontSize: 22, marginBottom: "14px" }}>
            {day7?.label ?? "Día 7"}: {d7}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
      }
    );
  } catch (error: any) {
    console.error("weekly-image error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Internal error",
        stack: error?.stack || null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
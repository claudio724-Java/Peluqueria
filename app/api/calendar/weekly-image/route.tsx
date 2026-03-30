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
  max = 5
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

    const lines: string[] = [
      snapshot.staffName
        ? `Agenda semanal - ${snapshot.staffName}`
        : "Agenda semanal - Vista global",
      snapshot.salonName,
      `Semana ${shortDate(snapshot.weekStart)} - ${shortDate(snapshot.weekEnd)} - ${snapshot.timezone}`,
      "",
      `Libres: ${snapshot.summary.free}`,
      `Parciales: ${snapshot.summary.partial}`,
      `Ocupados: ${snapshot.summary.busy}`,
      `Cerrados: ${snapshot.summary.closed}`,
      "",
    ];

    snapshot.days.slice(0, 7).forEach((day) => {
      const freeSlots = getFreeSlotsForDay(day, 5);
      lines.push(day.label);
      lines.push(
        freeSlots.length > 0
          ? `Huecos: ${freeSlots.join(", ")}`
          : "Huecos: sin disponibilidad"
      );
      lines.push("");
    });

    return new ImageResponse(
      (
        <div
          style={{
            width: "1400px",
            height: "1400px",
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            color: "#111827",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {lines.map((line, index) => (
            <div
              key={`${index}-${line}`}
              style={{
                fontSize: index === 0 ? 42 : index === 1 ? 28 : 22,
                fontWeight: index === 0 ? 700 : 400,
                marginBottom: line === "" ? 18 : 10,
                color: index <= 2 ? "#0F172A" : "#334155",
              }}
            >
              {line || " "}
            </div>
          ))}
        </div>
      ),
      {
        width: 1400,
        height: 1400,
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
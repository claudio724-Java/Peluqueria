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

function compactDayName(label: string) {
  return label.split(" ")[0] ?? label;
}

function colorForState(state: CellState) {
  switch (state) {
    case "FREE":
      return "#BBF7D0";
    case "BUSY":
      return "#FECACA";
    case "PARTIAL":
      return "#FDE68A";
    case "CLOSED":
    default:
      return "#E5E7EB";
  }
}

function stateLetter(state: CellState) {
  switch (state) {
    case "FREE":
      return "L";
    case "BUSY":
      return "O";
    case "PARTIAL":
      return "P";
    case "CLOSED":
    default:
      return "-";
  }
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
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ ok: false, error: "URL caducada" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
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
        { status: 401, headers: { "Content-Type": "application/json" } }
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
            slotIntervalMin: snapshot.slotIntervalMin,
            visualStartMin: snapshot.visualStartMin,
            visualEndMin: snapshot.visualEndMin,
            timeLabelsCount: snapshot.timeLabels?.length ?? 0,
            daysCount: snapshot.days?.length ?? 0,
            summary: snapshot.summary,
            firstDay: snapshot.days?.[0] ?? null,
          },
          null,
          2
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!snapshot.timeLabels?.length) {
      throw new Error("snapshot.timeLabels está vacío");
    }

    if (!snapshot.days?.length) {
      throw new Error("snapshot.days está vacío");
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
    const rows = snapshot.timeLabels.slice(0, 24);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1600px",
            height: "1100px",
            display: "flex",
            flexDirection: "column",
            background: "#F8FAFC",
            color: "#0F172A",
            fontFamily: "sans-serif",
            padding: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 42, fontWeight: 700 }}>
                {snapshot.staffName
                  ? `Agenda semanal - ${snapshot.staffName}`
                  : "Agenda semanal - Vista global"}
              </div>
              <div style={{ fontSize: 26, marginTop: 8 }}>{snapshot.salonName}</div>
              <div style={{ fontSize: 20, color: "#475569", marginTop: 8 }}>
                Semana {shortDate(snapshot.weekStart)} - {shortDate(snapshot.weekEnd)} -{" "}
                {snapshot.timezone}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "16px 20px",
                minWidth: "280px",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Resumen
              </div>
              <div style={{ fontSize: 18, marginBottom: 4 }}>
                Libres: {snapshot.summary.free}
              </div>
              <div style={{ fontSize: 18, marginBottom: 4 }}>
                Parciales: {snapshot.summary.partial}
              </div>
              <div style={{ fontSize: 18, marginBottom: 4 }}>
                Ocupados: {snapshot.summary.busy}
              </div>
              <div style={{ fontSize: 18 }}>
                Cerrados: {snapshot.summary.closed}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "18px",
              fontSize: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: "#BBF7D0",
                  marginRight: 8,
                  borderRadius: 999,
                }}
              />
              Libre
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: "#FDE68A",
                  marginRight: 8,
                  borderRadius: 999,
                }}
              />
              Parcial
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: "#FECACA",
                  marginRight: 8,
                  borderRadius: 999,
                }}
              />
              Ocupado
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: "#E5E7EB",
                  marginRight: 8,
                  borderRadius: 999,
                }}
              />
              Cerrado
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "20px",
              overflow: "hidden",
              flex: 1,
            }}
          >
            <div style={{ display: "flex", background: "#F8FAFC" }}>
              <div
                style={{
                  width: "120px",
                  padding: "14px 10px",
                  fontSize: 18,
                  fontWeight: 700,
                  borderRight: "1px solid #E2E8F0",
                  textAlign: "center",
                }}
              >
                Hora
              </div>

              {days.map((day) => (
                <div
                  key={day.date}
                  style={{
                    width: "210px",
                    padding: "14px 10px",
                    fontSize: 18,
                    fontWeight: 700,
                    borderRight: "1px solid #E2E8F0",
                    textAlign: "center",
                  }}
                >
                  {compactDayName(day.label)}
                </div>
              ))}
            </div>

            {rows.map((time, rowIndex) => (
              <div
                key={time}
                style={{
                  display: "flex",
                  borderTop: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#475569",
                    borderRight: "1px solid #E2E8F0",
                  }}
                >
                  {time}
                </div>

                {days.map((day) => {
                  const cell = day.cells[rowIndex];
                  const state = (cell?.state ?? "CLOSED") as CellState;

                  return (
                    <div
                      key={`${day.date}-${time}`}
                      style={{
                        width: "210px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#334155",
                        background: colorForState(state),
                        borderRight: "1px solid #E2E8F0",
                      }}
                    >
                      {stateLetter(state)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ),
      { width: 1600, height: 1100 }
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
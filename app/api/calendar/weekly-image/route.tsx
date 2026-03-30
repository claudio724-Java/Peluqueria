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
  max = 6
) {
  return day.cells
    .filter((cell) => cell.state === "FREE")
    .slice(0, max)
    .map((cell) => cell.label);
}

function getStateCounts(
  day: {
    cells: Array<{
      state: CellState;
    }>;
  }
) {
  return day.cells.reduce(
    (acc, cell) => {
      acc[cell.state] += 1;
      return acc;
    },
    {
      FREE: 0,
      BUSY: 0,
      PARTIAL: 0,
      CLOSED: 0,
    } as Record<CellState, number>
  );
}

function colorForState(state: CellState) {
  switch (state) {
    case "FREE":
      return "#DCFCE7";
    case "BUSY":
      return "#FEE2E2";
    case "PARTIAL":
      return "#FEF3C7";
    case "CLOSED":
    default:
      return "#E5E7EB";
  }
}

function labelForState(state: CellState) {
  switch (state) {
    case "FREE":
      return "Libre";
    case "BUSY":
      return "Ocupado";
    case "PARTIAL":
      return "Parcial";
    case "CLOSED":
    default:
      return "Cerrado";
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

    return new ImageResponse(
      (
        <div
          style={{
            width: "1600px",
            height: "1400px",
            display: "flex",
            flexDirection: "column",
            background: "#F8FAFC",
            color: "#0F172A",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "980px",
              }}
            >
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                {snapshot.staffName
                  ? `Agenda semanal - ${snapshot.staffName}`
                  : "Agenda semanal - Vista global"}
              </div>

              <div
                style={{
                  fontSize: 28,
                  color: "#334155",
                  marginBottom: "8px",
                }}
              >
                {snapshot.salonName}
              </div>

              <div
                style={{
                  fontSize: 20,
                  color: "#64748B",
                }}
              >
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
                borderRadius: "18px",
                padding: "18px 22px",
                minWidth: "320px",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                Resumen
              </div>

              <div style={{ fontSize: 18, marginBottom: "6px" }}>
                Libres: {snapshot.summary.free}
              </div>
              <div style={{ fontSize: 18, marginBottom: "6px" }}>
                Parciales: {snapshot.summary.partial}
              </div>
              <div style={{ fontSize: 18, marginBottom: "6px" }}>
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
              marginBottom: "20px",
              gap: "14px",
            }}
          >
            {(["FREE", "PARTIAL", "BUSY", "CLOSED"] as CellState[]).map((state) => (
              <div
                key={state}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "999px",
                  padding: "8px 14px",
                  fontSize: 16,
                  color: "#334155",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "999px",
                    background: colorForState(state),
                    marginRight: 8,
                  }}
                />
                {labelForState(state)}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {days.map((day) => {
              const freeSlots = getFreeSlotsForDay(day, 6);
              const counts = getStateCounts(day);

              return (
                <div
                  key={day.date}
                  style={{
                    width: "480px",
                    minHeight: "300px",
                    display: "flex",
                    flexDirection: "column",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "18px",
                    padding: "18px",
                    marginRight: "18px",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: "10px",
                    }}
                  >
                    {day.label}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        color: "#334155",
                      }}
                    >
                      Libres: {counts.FREE}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        color: "#334155",
                      }}
                    >
                      Parciales: {counts.PARTIAL}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        color: "#334155",
                      }}
                    >
                      Ocupados: {counts.BUSY}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      marginBottom: "12px",
                      color: "#334155",
                    }}
                  >
                    Primeros huecos libres
                  </div>

                  {freeSlots.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                      }}
                    >
                      {freeSlots.map((slot) => (
                        <div
                          key={`${day.date}-${slot}`}
                          style={{
                            fontSize: 18,
                            background: "#DCFCE7",
                            color: "#166534",
                            borderRadius: "999px",
                            padding: "8px 14px",
                            marginRight: "10px",
                            marginBottom: "10px",
                            border: "1px solid #BBF7D0",
                          }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 18,
                        color: "#64748B",
                      }}
                    >
                      Sin huecos libres
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
      {
        width: 1600,
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
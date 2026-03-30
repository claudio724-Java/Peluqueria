import { ImageResponse } from "next/og";
import { getWeeklyCalendarSnapshot } from "@/lib/weekly-calendar";
import { verifyCalendarImage } from "@/lib/calendar-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function colorForState(state: "FREE" | "BUSY" | "PARTIAL" | "CLOSED") {
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

function borderForState(state: "FREE" | "BUSY" | "PARTIAL" | "CLOSED") {
  switch (state) {
    case "FREE":
      return "#86EFAC";
    case "BUSY":
      return "#FCA5A5";
    case "PARTIAL":
      return "#FCD34D";
    case "CLOSED":
    default:
      return "#CBD5E1";
  }
}

function textForCell(
  state: "FREE" | "BUSY" | "PARTIAL" | "CLOSED",
  busyCount: number,
  workingCount: number
) {
  if (state === "CLOSED") return "Cerrado";
  if (state === "FREE") return workingCount > 1 ? `${workingCount} libres` : "Libre";
  if (state === "BUSY") return workingCount > 1 ? `${busyCount}/${workingCount}` : "Ocupado";
  return `${busyCount}/${workingCount}`;
}

function shortDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const salonId = url.searchParams.get("salonId");
  const weekStart = url.searchParams.get("weekStart");
  const staffId = url.searchParams.get("staffId") || undefined;
  const expiresAt = url.searchParams.get("expiresAt");
  const signature = url.searchParams.get("signature");

  if (!salonId || !weekStart || !expiresAt || !signature) {
    return new Response("Missing params", { status: 400 });
  }

  if (new Date(expiresAt).getTime() < Date.now()) {
    return new Response("URL caducada", { status: 401 });
  }

  const valid = verifyCalendarImage({
    salonId,
    weekStart,
    staffId,
    expiresAt,
    signature,
  });

  if (!valid) {
    return new Response("Firma inválida", { status: 401 });
  }

  const snapshot = await getWeeklyCalendarSnapshot({
    salonId,
    weekStart,
    staffId,
  });

  const rowHeight = Math.max(26, Math.floor(760 / snapshot.timeLabels.length));
  const title = snapshot.staffName
    ? `Agenda semanal · ${snapshot.staffName}`
    : "Agenda semanal · Vista global";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1600px",
          height: "1100px",
          background: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "sans-serif",
          padding: "36px",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 700, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 28, color: "#334155", marginBottom: 6 }}>
              {snapshot.salonName}
            </div>
            <div style={{ fontSize: 22, color: "#64748B" }}>
              Semana {shortDate(snapshot.weekStart)} - {shortDate(snapshot.weekEnd)} · {snapshot.timezone}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: "18px 22px",
              minWidth: 320,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Resumen</div>
            <div style={{ fontSize: 19, marginBottom: 4 }}>🟩 Libres: {snapshot.summary.free}</div>
            <div style={{ fontSize: 19, marginBottom: 4 }}>🟨 Parciales: {snapshot.summary.partial}</div>
            <div style={{ fontSize: 19, marginBottom: 4 }}>🟥 Ocupados: {snapshot.summary.busy}</div>
            <div style={{ fontSize: 19 }}>⬜ Cerrados: {snapshot.summary.closed}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: "18px", gap: "12px" }}>
          {[
            { label: "Libre", color: "#DCFCE7" },
            { label: "Parcial", color: "#FEF3C7" },
            { label: "Ocupado", color: "#FEE2E2" },
            { label: "Cerrado", color: "#E5E7EB" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 999,
                padding: "10px 16px",
                fontSize: 18,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  background: item.color,
                  borderRadius: 999,
                  marginRight: 10,
                  border: "1px solid #CBD5E1",
                }}
              />
              {item.label}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 110,
              flexDirection: "column",
              borderRight: "1px solid #E2E8F0",
              background: "#F8FAFC",
            }}
          >
            <div
              style={{
                height: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                borderBottom: "1px solid #E2E8F0",
              }}
            >
              Hora
            </div>

            {snapshot.timeLabels.map((time) => (
              <div
                key={time}
                style={{
                  height: rowHeight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#475569",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                {time}
              </div>
            ))}
          </div>

          {snapshot.days.map((day) => (
            <div
              key={day.date}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                borderRight: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  height: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  borderBottom: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                }}
              >
                {day.label}
              </div>

              {day.cells.map((cell) => (
                <div
                  key={`${day.date}-${cell.startMin}`}
                  style={{
                    height: rowHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    color: "#334155",
                    background: colorForState(cell.state),
                    borderBottom: "1px solid #FFFFFF",
                    borderLeft: `4px solid ${borderForState(cell.state)}`,
                  }}
                >
                  {textForCell(cell.state, cell.busyCount, cell.workingCount)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 1100,
    }
  );
}
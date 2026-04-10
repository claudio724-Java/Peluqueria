"use client";

import { useEffect, useMemo, useState } from "react";

type ApiSchedule = {
  id?: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

type ScheduleBlock = {
  id: string;
  dayOfWeek: number;
  start: string;
  end: string;
};

type Props = {
  staffId: string;
  staffName?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

function minToTime(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMin(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyWeek(): ScheduleBlock[] {
  return [];
}

export default function StaffScheduleModal({
  staffId,
  staffName,
  open,
  onClose,
  onSaved,
}: Props) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(emptyWeek());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const grouped = useMemo(() => {
    return DAYS.map((day) => ({
      ...day,
      blocks: blocks
        .filter((b) => b.dayOfWeek === day.value)
        .sort((a, b) => timeToMin(a.start) - timeToMin(b.start)),
    }));
  }, [blocks]);

  async function loadSchedules() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/staff/${staffId}/schedule`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo cargar el horario");
      }

      const mapped: ScheduleBlock[] = (data.schedules || []).map((s: ApiSchedule) => ({
        id: s.id || makeId(),
        dayOfWeek: s.dayOfWeek,
        start: minToTime(s.startMin),
        end: minToTime(s.endMin),
      }));

      setBlocks(mapped);
    } catch (e: any) {
      setError(e.message || "Error cargando horario");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && staffId) {
      loadSchedules();
    }
  }, [open, staffId]);

  function addBlock(dayOfWeek: number) {
    setBlocks((prev) => [
      ...prev,
      {
        id: makeId(),
        dayOfWeek,
        start: "09:00",
        end: "14:00",
      },
    ]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function updateBlock(id: string, field: "start" | "end", value: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  }

  function copyMondayToAll() {
    const mondayBlocks = blocks
      .filter((b) => b.dayOfWeek === 1)
      .map((b) => ({
        start: b.start,
        end: b.end,
      }));

    if (!mondayBlocks.length) {
      setError("Primero añade al menos un tramo el lunes.");
      return;
    }

    const newBlocks: ScheduleBlock[] = [];

    for (const day of DAYS) {
      for (const mb of mondayBlocks) {
        newBlocks.push({
          id: makeId(),
          dayOfWeek: day.value,
          start: mb.start,
          end: mb.end,
        });
      }
    }

    setBlocks(newBlocks);
    setError("");
    setSuccess("");
  }

  function applyMorningPreset(dayOfWeek: number) {
    const filtered = blocks.filter((b) => b.dayOfWeek !== dayOfWeek);
    setBlocks([
      ...filtered,
      {
        id: makeId(),
        dayOfWeek,
        start: "09:00",
        end: "14:00",
      },
    ]);
  }

  function applyAfternoonPreset(dayOfWeek: number) {
    const filtered = blocks.filter((b) => b.dayOfWeek !== dayOfWeek);
    setBlocks([
      ...filtered,
      {
        id: makeId(),
        dayOfWeek,
        start: "15:00",
        end: "20:00",
      },
    ]);
  }

  function applyFullDayPreset(dayOfWeek: number) {
    const filtered = blocks.filter((b) => b.dayOfWeek !== dayOfWeek);
    setBlocks([
      ...filtered,
      {
        id: makeId(),
        dayOfWeek,
        start: "09:00",
        end: "17:00",
      },
    ]);
  }

  function clearDay(dayOfWeek: number) {
    setBlocks((prev) => prev.filter((b) => b.dayOfWeek !== dayOfWeek));
  }

  function validateBlocks() {
    const normalized = blocks.map((b) => ({
      ...b,
      startMin: timeToMin(b.start),
      endMin: timeToMin(b.end),
    }));

    for (const b of normalized) {
      if (b.startMin >= b.endMin) {
        return `Hay un tramo inválido en ${DAYS.find((d) => d.value === b.dayOfWeek)?.label}.`;
      }
    }

    for (const day of DAYS) {
      const dayBlocks = normalized
        .filter((b) => b.dayOfWeek === day.value)
        .sort((a, b) => a.startMin - b.startMin);

      for (let i = 0; i < dayBlocks.length - 1; i++) {
        const current = dayBlocks[i];
        const next = dayBlocks[i + 1];
        if (current.endMin > next.startMin) {
          return `Hay tramos solapados en ${day.label}.`;
        }
      }
    }

    return "";
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const validationError = validateBlocks();
      if (validationError) {
        setError(validationError);
        setSaving(false);
        return;
      }

      const payload = {
        schedules: blocks
          .map((b) => ({
            dayOfWeek: b.dayOfWeek,
            startMin: timeToMin(b.start),
            endMin: timeToMin(b.end),
          }))
          .sort((a, b) =>
            a.dayOfWeek === b.dayOfWeek
              ? a.startMin - b.startMin
              : a.dayOfWeek - b.dayOfWeek
          ),
      };

      const res = await fetch(`/api/staff/${staffId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el horario");
      }

      setSuccess("Horario guardado correctamente.");
      onSaved?.();
    } catch (e: any) {
      setError(e.message || "Error guardando horario");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-schedule-title"
        aria-describedby="staff-schedule-description"
      >
        <div className="border-b px-6 py-4">
          <h2 id="staff-schedule-title" className="text-xl font-semibold">
            Horario de {staffName || "empleado"}
          </h2>
          <p id="staff-schedule-description" className="mt-1 text-sm text-gray-600">
            Configura los tramos semanales del empleado. Puedes añadir varios bloques por día.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b px-6 py-4">
          <button
            type="button"
            onClick={copyMondayToAll}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Copiar lunes al resto
          </button>
          <button
            type="button"
            onClick={loadSchedules}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-8 text-sm text-gray-600">Cargando horario...</div>
          ) : (
            <div className="space-y-6">
              {grouped.map((day) => (
                <div key={day.value} className="rounded-xl border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{day.label}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyMorningPreset(day.value)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => applyAfternoonPreset(day.value)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Tarde
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFullDayPreset(day.value)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Jornada continua
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock(day.value)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Añadir tramo
                      </button>
                      <button
                        type="button"
                        onClick={() => clearDay(day.value)}
                        className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Cerrar día
                      </button>
                    </div>
                  </div>

                  {day.blocks.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin horario configurado.</p>
                  ) : (
                    <div className="space-y-2">
                      {day.blocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3"
                        >
                          <label className="text-sm">
                            Inicio
                            <input
                              type="time"
                              value={block.start}
                              onChange={(e) =>
                                updateBlock(block.id, "start", e.target.value)
                              }
                              className="ml-2 rounded border px-2 py-1"
                            />
                          </label>

                          <label className="text-sm">
                            Fin
                            <input
                              type="time"
                              value={block.end}
                              onChange={(e) =>
                                updateBlock(block.id, "end", e.target.value)
                              }
                              className="ml-2 rounded border px-2 py-1"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="rounded-md border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-green-600">{success}</p> : null}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
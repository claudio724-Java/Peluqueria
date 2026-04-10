export default function StaffScheduleModal({ staffId }) {
  async function save() {
    await fetch(`/api/staff/${staffId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedules: [
          { dayOfWeek: 1, startMin: 540, endMin: 1200 },
        ],
      }),
    });
  }

  return (
    <div>
      <h2>Horario</h2>
      <button onClick={save}>Guardar</button>
    </div>
  );
}
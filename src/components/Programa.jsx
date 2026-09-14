const rows = [
  ["11:00", "Apertura del evento"],
  ["11:30", "Inicio de torneos"],
  ["13:00", "Entrega de completos"],
  ["14:00", "Continuación de torneos"],
  ["16:00", "Finales, premiación y cierre"],
];
export default function Programa() {
  return (
    <section className="section alt reveal" id="programa">
      <p className="eyebrow">Cronograma</p>
      <h2>Programa de la jornada</h2>
      <div className="schedule">
        {rows.map(([h, a]) => (
          <div className="schedule-row" key={h}>
            <time>{h}</time>
            <span>{a}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

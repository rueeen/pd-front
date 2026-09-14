const rows = [
  ["08:00 – 09:45", "Traslado e instalación de los 24 equipos desde el laboratorio LEICA"],
  ["09:45 – 10:00", "Acreditación de competidores"],
  ["10:00 – 10:15", "Apertura oficial"],
  ["10:15", [
    ["10:15 – 11:10", "Torneo Super Smash Bros. Ultimate, en consolas"],
    ["10:15 – 11:25", "Torneo VALORANT, en PC"],
  ]],
  ["11:25 – 12:15", "Pausa de alimentación y dinámicas con premios"],
  ["12:15 – 13:20", "Torneo League of Legends en modo ARAM, en PC"],
  ["13:20 – 14:45", "Juego libre en consolas y PC, dinámicas abiertas"],
  ["14:45 – 15:30", "Premiación"],
  ["15:30 – 16:00", "Cierre oficial y fotografía grupal"],
];
export default function Programa() {
  return (
    <section className="section alt reveal" id="programa">
      <p className="eyebrow">Cronograma</p>
      <h2>Programa de la jornada</h2>
      <div className="schedule">
        {rows.map(([h, activity]) =>
          Array.isArray(activity) ? (
            <div className="schedule-row simultaneous-row" key={h}>
              <div className="simultaneous-heading">
                <time>{h}</time>
                <strong>En simultáneo</strong>
              </div>
              <div className="simultaneous-activities">
                {activity.map(([range, description]) => (
                  <article key={description}>
                    <time>{range}</time>
                    <span>{description}</span>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="schedule-row" key={h}>
              <time>{h}</time>
              <span>{activity}</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

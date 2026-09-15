const rows = [
  ["09:40 – 10:30", "Acreditación de competidores"],
  ["10:30 – 10:45", "Apertura oficial"],
  ["10:45 – 11:00", "Prueba técnica y margen de inicio"],
  ["11:00 – 12:10", [
    ["11:00 – 12:10", "Torneo Mario Kart en consolas"],
    ["11:00 – 12:10", "Torneo VALORANT en PC"],
  ]],
  ["12:10 – 13:10", "Pausa de alimentación y dinámicas con premios"],
  ["13:10 – 14:25", [
    ["13:10 – 14:25", "Torneo Super Smash Bros. en consolas"],
    ["13:10 – 14:25", "Torneo League of Legends en PC"],
  ]],
  ["14:25 – 15:45", "Juego libre en consolas y PC, dinámicas abiertas"],
  ["15:45 – 16:30", "Premiación"],
  ["16:30 – 17:00", "Cierre oficial y fotografía grupal"],
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

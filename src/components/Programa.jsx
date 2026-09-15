import { MOSTRAR_PREMIOS } from "../config/visibilidad";

// Si MOSTRAR_COMPLETOS vuelve a activarse, la pausa de alimentación debe
// reponerse como una decisión del programa y hay que revisar estos horarios.

const rows = [
  ["09:40 – 10:30", "Acreditación de competidores"],
  ["10:30 – 10:45", "Apertura oficial"],
  ["10:45 – 11:00", "Prueba técnica y margen de inicio"],
  ["11:00 – 12:30", [
    ["11:00 – 12:30", "Torneo Mario Kart en consolas"],
    ["11:00 – 12:30", "Torneo VALORANT en PC"],
  ]],
  ["12:30 – 13:00", "Intermedio y dinámicas abiertas"],
  ["13:00 – 14:45", [
    ["13:00 – 14:45", "Torneo Super Smash Bros. en consolas"],
    ["13:00 – 14:45", "Torneo League of Legends en PC"],
  ]],
  ["14:45 – 15:45", "Juego libre en consolas y PC"],
  [
    "15:45 – 16:30",
    MOSTRAR_PREMIOS ? "Premiación" : "Cierre de torneos y reconocimientos",
  ],
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

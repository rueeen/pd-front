import { Link } from "react-router-dom";

export default function TorneoCard({ t }) {
  const time = (value) => value?.slice(0, 5);
  const modes = {
    individual: "Individual",
    equipos: "Por equipos",
    equipo: "Por equipos",
  };
  const descriptions = {
    smash: "Combate en arena uno contra uno.",
    valorant: "Competencia táctica por equipos.",
    "lol-aram": "Estrategia por equipos en sala personalizada.",
  };
  const icons = { smash: "⚔", valorant: "⌖", "lol-aram": "◆" };
  return (
    <article className="card">
      <span className="game-icon" aria-hidden="true">{icons[t.slug] || "◇"}</span>
      <h3>{t.nombre}</h3>
      {descriptions[t.slug] && <p className="card-description">{descriptions[t.slug]}</p>}
      <p>
        <span className="data-label">Horario</span> {time(t.hora_inicio)} – {time(t.hora_fin)}
      </p>
      <p>{modes[t.modalidad] ?? t.modalidad}</p>
      <strong className="availability">{t.cupos_disponibles} cupos disponibles</strong>
      <span className="tournament-status">{t.estado === "finalizado" ? "Finalizado" : t.estado === "en_curso" ? "En curso" : t.inscripciones_abiertas ? "Inscripciones abiertas" : "Pendiente de sorteo"}</span>
      <div className="card-actions">
        {t.inscripciones_abiertas && <Link className="button" to={`/torneos/${t.slug}/inscripcion`}>Inscribirme</Link>}
        {!t.inscripciones_abiertas && <Link className="button secondary" to={`/torneos/${t.slug}/llave`}>Ver llave</Link>}
      </div>
    </article>
  );
}

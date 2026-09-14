import { Link } from "react-router-dom";

export default function TorneoCard({ t }) {
  const time = (value) => value?.slice(0, 5);
  const modes = {
    individual: "Individual",
    equipos: "Por equipos",
    equipo: "Por equipos",
  };
  return (
    <article className="card">
      <h3>{t.nombre}</h3>
      <p>
        {time(t.hora_inicio)} – {time(t.hora_fin)}
      </p>
      <p>{modes[t.modalidad] ?? t.modalidad}</p>
      <strong>{t.cupos_disponibles} cupos disponibles</strong>
      <Link
        className="button"
        to={`/torneos/${t.slug}/${t.inscripciones_abiertas ? "inscripcion" : "llave"}`}
      >
        {t.inscripciones_abiertas ? "Inscribirme" : "Ver llave"}
      </Link>
    </article>
  );
}

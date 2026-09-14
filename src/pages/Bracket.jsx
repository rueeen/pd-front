import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import BracketLlave from "../components/BracketLlave";
export default function Bracket() {
  const { slug } = useParams(),
    [d, setD] = useState(),
    [e, setE] = useState("");
  const load = useCallback(() => {
    setE("");
    api
      .get(`/api/torneos/${slug}/bracket/`)
      .then((r) => {
        if (
          !Array.isArray(r.data?.rondas) ||
          !r.data.rondas.every((round) => Array.isArray(round.partidas))
        ) {
          throw new TypeError(
            "Los datos de la llave no contienen listas válidas.",
          );
        }
        setD(r.data);
      })
      .catch((requestError) => {
        console.error("No pudimos cargar la llave.", requestError);
        setD(undefined);
        setE("No pudimos cargar la llave.");
      });
  }, [slug]);
  useEffect(load, [load]);
  return (
    <main className="bracket-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Eliminación directa</p>
          <h1>{d?.torneo || d?.nombre || "Llave del torneo"}</h1>
          <div className="tournament-meta">
            {d?.horario && <span>Bloque {d.horario}</span>}
            <strong>
              {d?.estado === "finalizado"
                ? "Finalizado"
                : d?.rondas?.length
                  ? "En curso"
                  : "Pendiente de sorteo"}
            </strong>
          </div>
        </div>
        <div className="actions">
          <Link className="button secondary" to="/torneos">
            Todos los torneos
          </Link>
          <button className="secondary" onClick={load}>
            Recargar llave
          </button>
        </div>
      </header>
      {e && <p className="error">{e}</p>}
      {d?.rondas?.length ? (
        <BracketLlave rondas={d.rondas} />
      ) : (
        d && (
          <section className="pending-bracket">
            <h2>El sorteo aún no se realiza</h2>
            <p className="lead">
              <strong>{d.equipos_inscritos ?? d.inscritos ?? 0}</strong> de{" "}
              {d.cupo_equipos ?? d.cupos ?? 0} equipos inscritos.
            </p>
            <p>
              La llave se publica al realizarse el sorteo, antes del bloque de
              competencia.
            </p>
          </section>
        )
      )}
    </main>
  );
}

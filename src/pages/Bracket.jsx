import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
      .then((r) => setD(r.data))
      .catch(() => setE("No pudimos cargar la llave."));
  }, [slug]);
  useEffect(load, [load]);
  return (
    <main>
      <h1>Llave del torneo</h1>
      <button onClick={load}>Recargar llave</button>
      {e && <p className="error">{e}</p>}
      {d?.rondas?.length ? (
        <BracketLlave rondas={d.rondas} />
      ) : (
        d && (
          <section>
            <h2>El sorteo aún no se realiza</h2>
            <p>Bloque: {d.horario}</p>
            <h3>Equipos inscritos</h3>
            <ul>
              {d.equipos_confirmados.map((x) => (
                <li key={x.id}>{x.nombre}</li>
              ))}
            </ul>
          </section>
        )
      )}
    </main>
  );
}

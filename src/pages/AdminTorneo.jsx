import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import BracketLlave from "../components/BracketLlave";

export default function AdminTorneo() {
  const { slug } = useParams();
  const [data, setData] = useState();
  const [error, setError] = useState("");
  const [scores, setScores] = useState({});
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => {
    setError("");
    return api
      .get(`/api/admin/torneos/${slug}/`)
      .then((response) => setData(response.data))
      .catch(() => setError("No se pudo cargar el torneo."));
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id, estado) {
    try {
      await api.patch(`/api/admin/equipos/${id}/`, { estado });
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "No se pudo actualizar el equipo.",
      );
    }
  }

  function requestDraw() {
    setDialog({
      type: "draw",
      title: "¿Sortear la llave?",
      text: "Se borrarán las partidas existentes. Esta acción no se puede deshacer.",
    });
  }

  function requestSave(match) {
    if (match.ganador) {
      setDialog({
        type: "save",
        match,
        title: "¿Corregir este resultado?",
        text: "Se limpiarán las rondas posteriores para recalcular el avance.",
      });
    } else {
      save(match);
    }
  }

  async function draw() {
    setDialog(null);
    setError("");
    try {
      await api.post(`/api/admin/torneos/${slug}/sorteo/`);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || "No se pudo sortear la llave.",
      );
    }
  }

  async function save(match) {
    setDialog(null);
    const matchScores = scores[match.id] || {};
    const scoreA = matchScores.a ?? match.score_a;
    const scoreB = matchScores.b ?? match.score_b;
    setError("");
    try {
      await api.patch(`/api/admin/partidas/${match.id}/resultado/`, {
        score_a: Number(scoreA),
        score_b: Number(scoreB),
      });
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "No se pudo guardar el resultado.",
      );
    }
  }

  const games = (data?.rondas || []).flatMap((round) => round.partidas);
  return (
    <main>
      <h1>{data?.torneo || "Administrar torneo"}</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        disabled={!data || data.estado === "finalizado"}
        onClick={requestDraw}
      >
        Sortear llave
      </button>
      <h2>Equipos</h2>
      {[
        ["equipos_confirmados", "Confirmados"],
        ["equipos_espera", "Lista de espera"],
      ].map(([group, title]) => (
        <section key={group}>
          <h3>{title}</h3>
          {(data?.[group] || []).map((team) => (
            <article className="card" key={team.id}>
              <strong>{team.nombre}</strong>
              <div className="actions">
                {group === "equipos_espera" && (
                  <button onClick={() => changeStatus(team.id, "confirmado")}>
                    Promover
                  </button>
                )}
                <button
                  className="secondary"
                  onClick={() => changeStatus(team.id, "retirado")}
                >
                  Dar de baja
                </button>
              </div>
            </article>
          ))}
        </section>
      ))}
      <h2>Llave editable</h2>
      <BracketLlave rondas={data?.rondas} />
      {games
        .filter((match) => match.equipo_a && match.equipo_b)
        .map((match) => (
          <form
            className="card"
            key={match.id}
            onSubmit={(event) => {
              event.preventDefault();
              requestSave(match);
            }}
          >
            <h3>
              {match.equipo_a.nombre} contra {match.equipo_b.nombre}
            </h3>
            <div className="actions">
              <input
                aria-label={`Puntaje de ${match.equipo_a.nombre}`}
                type="number"
                min="0"
                required
                value={scores[match.id]?.a ?? match.score_a ?? ""}
                onChange={(event) =>
                  setScores({
                    ...scores,
                    [match.id]: { ...scores[match.id], a: event.target.value },
                  })
                }
              />
              <input
                aria-label={`Puntaje de ${match.equipo_b.nombre}`}
                type="number"
                min="0"
                required
                value={scores[match.id]?.b ?? match.score_b ?? ""}
                onChange={(event) =>
                  setScores({
                    ...scores,
                    [match.id]: { ...scores[match.id], b: event.target.value },
                  })
                }
              />
              <button>Guardar resultado</button>
            </div>
          </form>
        ))}
      {dialog && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <h2 id="dialog-title">{dialog.title}</h2>
            <p>{dialog.text}</p>
            <div className="actions">
              <button
                onClick={
                  dialog.type === "draw" ? draw : () => save(dialog.match)
                }
              >
                Sí, continuar
              </button>
              <button className="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

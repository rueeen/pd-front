import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import BracketLlave from "../components/BracketLlave";

export default function AdminTorneo() {
  const { slug } = useParams();
  const [data, setData] = useState();
  const [error, setError] = useState("");
  const [scores, setScores] = useState({});
  const [openMatch, setOpenMatch] = useState(null);
  const [onlyAccredited, setOnlyAccredited] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [capacityForm, setCapacityForm] = useState({
    cupo_equipos: "",
    cierre_inscripciones: "",
  });
  const [capacityError, setCapacityError] = useState("");
  const [warning, setWarning] = useState("");
  const [promoted, setPromoted] = useState([]);

  const load = useCallback(() => {
    setError("");
    return api
      .get(`/api/admin/torneos/${slug}/`)
      .then(({ data: next }) => {
        if (
          ![
            next?.equipos_confirmados,
            next?.equipos_espera,
            next?.rondas,
          ].every(Array.isArray) ||
          !next.rondas.every((round) => Array.isArray(round.partidas))
        ) {
          throw new TypeError(
            "Los datos del torneo no contienen listas válidas.",
          );
        }
        setData(next);
        setCapacityForm({
          cupo_equipos: next.cupo_equipos ?? next.cupo ?? "",
          cierre_inscripciones:
            next.cierre_inscripciones ?? next.plazo_cierre_inscripciones ?? "",
        });
      })
      .catch((requestError) => {
        console.error("No se pudo cargar el torneo.", requestError);
        setData(undefined);
        setError("No se pudo cargar el torneo.");
      });
  }, [slug]);

  async function saveCapacity(event) {
    event.preventDefault();
    setCapacityError("");
    setWarning("");
    try {
      const { data: response } = await api.patch(
        `/api/admin/torneos/${slug}/`,
        {
          cupo_equipos: Number(capacityForm.cupo_equipos),
          cierre_inscripciones: capacityForm.cierre_inscripciones || null,
        },
      );
      setWarning(response.advertencia || "");
      setPromoted(
        response.equipos_promovidos || response.promovidos || [],
      );
      await load();
    } catch (requestError) {
      console.error("No se pudo actualizar el cupo del torneo.", requestError);
      setCapacityError(
        requestError.response?.data?.detail ||
          "No se pudo actualizar el cupo del torneo.",
      );
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  async function patchTeam(id, values) {
    setError("");
    try {
      await api.patch(`/api/admin/equipos/${id}/`, values);
      await load();
    } catch (requestError) {
      console.error("No se pudo actualizar el equipo.", requestError);
      setError(
        requestError.response?.data?.detail ||
          "No se pudo actualizar el equipo.",
      );
    }
  }

  function requestResult(match, payload) {
    if (match.ganador) {
      setDialog({
        type: "result",
        match,
        payload,
        title: "¿Corregir este resultado?",
        text: "Se limpiarán las rondas posteriores para recalcular el avance.",
      });
    } else submitResult(match, payload);
  }

  async function draw() {
    setDialog(null);
    setError("");
    try {
      await api.post(`/api/admin/torneos/${slug}/sorteo/`, {
        solo_acreditados: onlyAccredited,
      });
      await load();
    } catch (requestError) {
      console.error("No se pudo sortear la llave.", requestError);
      setError(
        requestError.response?.data?.detail || "No se pudo sortear la llave.",
      );
    }
  }

  async function submitResult(match, payload) {
    setDialog(null);
    setError("");
    try {
      await api.patch(`/api/admin/partidas/${match.id}/resultado/`, payload);
      setOpenMatch(null);
      setScores((current) => ({ ...current, [match.id]: undefined }));
      await load();
    } catch (requestError) {
      console.error("No se pudo guardar el resultado.", requestError);
      setError(
        requestError.response?.data?.detail ||
          "No se pudo guardar el resultado.",
      );
    }
  }

  function resultEditor(match) {
    const isOpen = openMatch === match.id;
    const current = scores[match.id] || {};
    if (!isOpen)
      return (
        <button
          className="edit-match secondary"
          type="button"
          onClick={() => setOpenMatch(match.id)}
        >
          Cargar resultado
        </button>
      );
    return (
      <form
        className="match-form"
        onSubmit={(event) => {
          event.preventDefault();
          requestResult(match, {
            score_a: Number(current.a ?? match.score_a),
            score_b: Number(current.b ?? match.score_b),
          });
        }}
      >
        {[
          ["a", match.equipo_a],
          ["b", match.equipo_b],
        ].map(([side, team]) => (
          <div className="score-control" key={side}>
            <label htmlFor={`score-${match.id}-${side}`}>{team.nombre}</label>
            <input
              id={`score-${match.id}-${side}`}
              type="number"
              min="0"
              required
              value={current[side] ?? match[`score_${side}`] ?? ""}
              onChange={(event) =>
                setScores({
                  ...scores,
                  [match.id]: { ...current, [side]: event.target.value },
                })
              }
            />
            <button
              className="secondary walkover"
              type="button"
              onClick={() => requestResult(match, { walkover: side })}
            >
              No se presentó
            </button>
          </div>
        ))}
        <div className="actions">
          <button type="submit">Guardar</button>
          <button
            className="secondary"
            type="button"
            onClick={() => setOpenMatch(null)}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  const confirmed = data?.equipos_confirmados || [];
  const accredited = confirmed.filter((team) => team.acreditado).length;
  const drawn =
    data?.sorteado === true ||
    data?.estado === "sorteado" ||
    (data?.rondas || []).some((round) => round.partidas.length > 0);
  return (
    <main className="admin-page">
      <p className="eyebrow">Coordinación</p>
      <h1>{data?.torneo || "Administrar torneo"}</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {promoted.length > 0 && (
        <section className="promotion-notice" role="status">
          <h2>Equipos promovidos</h2>
          <p>Avísales por WhatsApp que ya entraron al torneo:</p>
          <ul>
            {promoted.map((team) => (
              <li key={team.id || team.nombre}>
                <strong>{team.nombre}</strong> — Capitán: {team.capitan?.nombre || team.capitan_nombre || "Por definir"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="accreditation">
        <div className="section-heading">
          <div>
            <h2>Acreditación</h2>
            <p className="accreditation-count">
              <strong>{accredited}</strong> de {confirmed.length} equipos
              acreditados
            </p>
          </div>
        </div>
        <div className="team-list">
          {confirmed.map((team) => (
            <details
              className={`card accreditation-card ${team.acreditado ? "is-accredited" : ""}`}
              key={team.id}
            >
              <summary>
                <span>
                  <i aria-hidden="true" /> <strong>{team.nombre}</strong>
                  <small>
                    Capitán:{" "}
                    {team.capitan?.nombre ||
                      team.capitan_nombre ||
                      "Por definir"}
                  </small>
                </span>
                <span>{team.acreditado ? "Acreditado" : "No acreditado"}</span>
              </summary>
              <div className="roster">
                <h3>Integrantes</h3>
                {(team.integrantes || []).length ? (
                  (team.integrantes || []).map((member) => (
                    <p key={member.id || member.codigo_pase}>
                      <span>
                        {member.nombre ||
                          member.nombre_completo ||
                          "Por definir"}
                      </span>
                      <code>
                        {member.codigo_pase ||
                          member.pase?.codigo ||
                          "Sin código"}
                      </code>
                    </p>
                  ))
                ) : (
                  <p>No hay integrantes informados.</p>
                )}
                <button
                  type="button"
                  className={team.acreditado ? "secondary" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    patchTeam(team.id, { acreditado: !team.acreditado });
                  }}
                >
                  {team.acreditado ? "Quitar acreditación" : "Acreditar equipo"}
                </button>
              </div>
            </details>
          ))}
        </div>
        <form className="config-form" onSubmit={saveCapacity}>
          <h3>Cupo e inscripciones</h3>
          {warning && <p className="warning" role="status">{warning}</p>}
          <div className="inline-fields">
            <div className="field">
              <label htmlFor="tournament-capacity">Cupo de equipos</label>
              <input
                id="tournament-capacity"
                type="number"
                min="1"
                required
                disabled={drawn}
                value={capacityForm.cupo_equipos}
                aria-invalid={Boolean(capacityError)}
                onChange={(event) => setCapacityForm({ ...capacityForm, cupo_equipos: event.target.value })}
              />
              {capacityError && <p className="error" role="alert">{capacityError}</p>}
            </div>
            <div className="field">
              <label htmlFor="registration-deadline">Cierre de inscripciones</label>
              <input
                id="registration-deadline"
                type="datetime-local"
                value={capacityForm.cierre_inscripciones?.slice(0, 16) || ""}
                onChange={(event) => setCapacityForm({ ...capacityForm, cierre_inscripciones: event.target.value })}
              />
            </div>
          </div>
          {drawn && (
            <p className="submit-hint">El cupo no se puede editar mientras el torneo esté sorteado. Primero despublica la llave.</p>
          )}
          <button type="submit" disabled={!data}>Guardar cupo y plazo</button>
        </form>
        <div className="draw-controls">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyAccredited}
              onChange={(event) => setOnlyAccredited(event.target.checked)}
            />{" "}
            Sortear solo con equipos acreditados
          </label>
          <button
            disabled={!data || data.estado === "finalizado"}
            onClick={() =>
              setDialog({
                type: "draw",
                title: "¿Sortear la llave?",
                text: "Se borrarán las partidas existentes. Esta acción no se puede deshacer.",
              })
            }
          >
            Sortear llave
          </button>
        </div>
      </section>

      <section>
        <h2>Llave editable</h2>
        <BracketLlave rondas={data?.rondas} renderEditor={resultEditor} />
      </section>

      <section>
        <h2>Gestión de equipos</h2>
        <h3>Lista de espera</h3>
        {(data?.equipos_espera || []).map((team) => (
          <article className="card team-row" key={team.id}>
            <strong>{team.nombre}</strong>
            <div className="actions">
              <button
                onClick={() => patchTeam(team.id, { estado: "confirmado" })}
              >
                Promover
              </button>
              <button
                className="secondary"
                onClick={() => patchTeam(team.id, { estado: "retirado" })}
              >
                Dar de baja
              </button>
            </div>
          </article>
        ))}
      </section>

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
                  dialog.type === "draw"
                    ? draw
                    : () => submitResult(dialog.match, dialog.payload)
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

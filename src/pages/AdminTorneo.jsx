import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { apiErrorMessage } from "../api";
import BracketLlave from "../components/BracketLlave";

export default function AdminTorneo() {
  const { slug } = useParams();
  const [data, setData] = useState();
  const [error, setError] = useState("");
  const [scores, setScores] = useState({});
  const [openMatch, setOpenMatch] = useState(null);
  const [matchErrors, setMatchErrors] = useState({});
  const [correctionMode, setCorrectionMode] = useState(false);
  const [onlyAccredited, setOnlyAccredited] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [capacityForm, setCapacityForm] = useState({
    cupo_equipos: "",
    cierre_inscripciones: "",
  });
  const [capacityError, setCapacityError] = useState("");
  const [warning, setWarning] = useState("");
  const [promoted, setPromoted] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ nombre: "", capitan_rut: "" });
  const [teamErrors, setTeamErrors] = useState({});
  const [replacement, setReplacement] = useState(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [replacementForm, setReplacementForm] = useState({
    gamertag: "",
    motivo: "no_se_presento",
    detalle: "",
    nombre_equipo: "",
    forzar: false,
  });
  const [replacementError, setReplacementError] = useState("");
  const [replacementSaving, setReplacementSaving] = useState(false);
  const [success, setSuccess] = useState("");

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
        setError(apiErrorMessage(requestError, "No se pudo cargar el torneo."));
      });
  }, [slug]);

  async function saveCapacity(event) {
    event.preventDefault();
    setCapacityError("");
    setWarning("");
    const nextCapacity = Number(capacityForm.cupo_equipos);
    const currentCapacity = Number(data?.cupo_equipos ?? data?.cupo ?? 0);
    if (nextCapacity < currentCapacity) {
      setCapacityError(
        "El cupo solo se puede ampliar. Para sacar equipos, dales de baja uno a uno.",
      );
      return;
    }
    try {
      const { data: response } = await api.patch(
        `/api/admin/torneos/${slug}/`,
        {
          cupo_equipos: nextCapacity,
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

  useEffect(() => {
    if (!replacement || candidateQuery.trim().length < 2) {
      setCandidates([]);
      setCandidateLoading(false);
      return undefined;
    }
    let ignore = false;
    setCandidateLoading(true);
    const timer = setTimeout(() => {
      api
        .get(`/api/admin/torneos/${slug}/candidatos/`, {
          params: { q: candidateQuery.trim() },
        })
        .then(({ data: results }) => {
          if (!ignore) setCandidates(Array.isArray(results) ? results : []);
        })
        .catch((requestError) => {
          if (!ignore) {
            setCandidates([]);
            setReplacementError(
              apiErrorMessage(requestError, "No se pudieron buscar comodines."),
            );
          }
        })
        .finally(() => {
          if (!ignore) setCandidateLoading(false);
        });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [candidateQuery, replacement, slug]);

  useEffect(() => {
    if (!replacement && !dialog) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        if (replacementSaving) return;
        setReplacement(null);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog, replacement, replacementSaving]);

  function beginReplacement(team, integrante) {
    setReplacement({ team, integrante });
    setCandidateQuery("");
    setCandidates([]);
    setSelectedCandidate(null);
    setReplacementError("");
    setReplacementForm({
      gamertag: "",
      motivo: "no_se_presento",
      detalle: "",
      nombre_equipo: "",
      forzar: false,
    });
  }

  async function submitReplacement(event) {
    event.preventDefault();
    if (!selectedCandidate || (selectedCandidate.conflicto_bloque && !replacementForm.forzar)) return;
    setReplacementSaving(true);
    setReplacementError("");
    try {
      const payload = {
        rut_saliente: replacement.integrante.rut,
        rut_entrante: selectedCandidate.rut,
        motivo: replacementForm.motivo,
        ...(replacementForm.detalle ? { detalle: replacementForm.detalle } : {}),
        ...(replacementForm.gamertag ? { gamertag: replacementForm.gamertag } : {}),
        ...(data?.modalidad === "individual" && replacementForm.nombre_equipo
          ? { nombre_equipo: replacementForm.nombre_equipo }
          : {}),
        ...(selectedCandidate.conflicto_bloque ? { forzar: true } : {}),
      };
      await api.post(`/api/admin/equipos/${replacement.team.id}/reemplazar/`, payload);
      const teamName = replacement.team.nombre;
      setReplacement(null);
      await load();
      setSuccess(`Comodín ingresado en ${teamName}`);
      window.setTimeout(() => setSuccess(""), 4000);
    } catch (requestError) {
      setReplacementError(apiErrorMessage(requestError, "No se pudo realizar el reemplazo."));
    } finally {
      setReplacementSaving(false);
    }
  }

  async function saveTeam(event, team) {
    event.preventDefault();
    const currentCaptain = (team.integrantes || []).find((member) => member.es_capitan)?.rut || team.capitan_rut || "";
    const values = {};
    if (teamForm.nombre.trim() !== team.nombre) values.nombre = teamForm.nombre.trim();
    if (teamForm.capitan_rut !== currentCaptain) values.capitan_rut = teamForm.capitan_rut;
    if (!Object.keys(values).length) {
      setEditingTeam(null);
      return;
    }
    setTeamErrors((current) => ({ ...current, [team.id]: "" }));
    try {
      await api.patch(`/api/admin/equipos/${team.id}/`, values);
      setEditingTeam(null);
      await load();
    } catch (requestError) {
      setTeamErrors((current) => ({
        ...current,
        [team.id]: apiErrorMessage(requestError, "No se pudo actualizar el equipo."),
      }));
    }
  }

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

  async function changeTournamentState(action) {
    setDialog(null);
    setError("");
    try {
      await api.post(`/api/admin/torneos/${slug}/${action}/`);
      await load();
    } catch (requestError) {
      console.error("No se pudo cambiar el estado del torneo.", requestError);
      setError(
        requestError.response?.data?.detail ||
          "No se pudo cambiar el estado del torneo.",
      );
    }
  }

  async function submitResult(match, payload) {
    setDialog(null);
    setMatchErrors((current) => ({ ...current, [match.id]: "" }));
    try {
      await api.patch(`/api/admin/partidas/${match.id}/resultado/`, {
        ...payload,
        ...(correctionMode ? { reabrir: true } : {}),
      });
      setOpenMatch(null);
      setScores((current) => ({ ...current, [match.id]: undefined }));
      await load();
    } catch (requestError) {
      console.error("No se pudo guardar el resultado.", requestError);
      setMatchErrors((current) => ({
        ...current,
        [match.id]:
          requestError.response?.data?.detail ||
          "No se pudo guardar el resultado.",
      }));
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
          onClick={() => {
            setMatchErrors((errors) => ({ ...errors, [match.id]: "" }));
            setOpenMatch(match.id);
          }}
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
        {matchErrors[match.id] && (
          <p className="match-error error" role="alert">
            {matchErrors[match.id]}
          </p>
        )}
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
  const state = data?.estado || "inscripcion";
  const finished = state === "finalizado";
  const bracketIsEditable = !finished || correctionMode;
  const acceptingRegistrations = state === "inscripcion";
  const closed = state === "cerrado";
  const stateLabels = {
    inscripcion: "Inscripciones abiertas",
    cerrado: "Inscripciones cerradas",
    sorteado: "Llave sorteada",
    en_curso: "En curso",
    finalizado: "Finalizado",
  };
  return (
    <main className="admin-page">
      <header className="admin-tournament-header">
        <div>
          <p className="eyebrow">Coordinación</p>
          <h1>{data?.torneo || "Administrar torneo"}</h1>
        </div>
        {data && (
          <div className="admin-state-actions">
            <p className={`admin-state admin-state-${state}`}>
              <span>Estado actual</span>
              <strong>{stateLabels[state] || state}</strong>
            </p>
            {finished && !correctionMode && (
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  setDialog({
                    type: "correction-mode",
                    title: "¿Corregir resultados?",
                    text: "Corregir un resultado puede borrar los resultados de las rondas posteriores y cambiar el campeón.",
                  })
                }
              >
                Corregir resultados
              </button>
            )}
          </div>
        )}
      </header>
      {correctionMode && (
        <aside className="correction-mode-notice" role="alert">
          <div>
            <strong>Modo corrección activo</strong>
            <p>
              Estás corrigiendo resultados de un torneo ya finalizado. Los
              cambios pueden borrar rondas posteriores y cambiar el campeón.
            </p>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setCorrectionMode(false);
              setOpenMatch(null);
              setMatchErrors({});
            }}
          >
            Salir del modo corrección
          </button>
        </aside>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && <p className="success-notice" role="status">{success}</p>}

      {promoted.length > 0 && (
        <section className="promotion-notice" role="status">
          <div className="section-heading">
            <h2>Equipos promovidos</h2>
            <button className="secondary" type="button" onClick={() => setPromoted([])}>
              Descartar aviso
            </button>
          </div>
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
                    <div className="roster-integrante" key={member.rut || member.codigo}>
                      <span>
                        {member.nombre ||
                          member.nombre_completo ||
                          "Por definir"}
                        {member.apellido ? ` ${member.apellido}` : ""}
                        {member.es_capitan && <small className="badge-capitan">Capitán</small>}
                        {member.es_comodin && <small className="badge-comodin">Comodín</small>}
                      </span>
                      <div className="roster-acciones">
                        <code>{member.codigo || "Sin código"}</code>
                        {!finished && <button className="secondary" type="button" onClick={() => beginReplacement(team, member)}>Reemplazar</button>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No hay integrantes informados.</p>
                )}
                {editingTeam === team.id ? (
                  <form className="team-edit-form" onSubmit={(event) => saveTeam(event, team)}>
                    <div className="field">
                      <label htmlFor={`team-name-${team.id}`}>Nombre del equipo</label>
                      <input id={`team-name-${team.id}`} required value={teamForm.nombre} onChange={(event) => setTeamForm({ ...teamForm, nombre: event.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor={`team-captain-${team.id}`}>Capitán</label>
                      <select id={`team-captain-${team.id}`} required value={teamForm.capitan_rut} onChange={(event) => setTeamForm({ ...teamForm, capitan_rut: event.target.value })}>
                        {(team.integrantes || []).map((member) => <option key={member.rut} value={member.rut}>{member.nombre_completo || `${member.nombre || ""} ${member.apellido || ""}`.trim() || member.rut}</option>)}
                      </select>
                    </div>
                    {teamErrors[team.id] && <p className="error" role="alert">{teamErrors[team.id]}</p>}
                    <div className="actions"><button type="submit">Guardar</button><button className="secondary" type="button" onClick={() => setEditingTeam(null)}>Cancelar</button></div>
                  </form>
                ) : (
                  <button type="button" className="secondary edit-team-button" onClick={() => {
                    const captain = (team.integrantes || []).find((member) => member.es_capitan);
                    setTeamForm({ nombre: team.nombre || "", capitan_rut: captain?.rut || team.capitan_rut || "" });
                    setTeamErrors((current) => ({ ...current, [team.id]: "" }));
                    setEditingTeam(team.id);
                  }}>Editar equipo</button>
                )}
                {(team.cambios || []).length > 0 && <details className="changes-history">
                  <summary>Cambios ({team.cambios.length})</summary>
                  <ul>{team.cambios.map((change, index) => <li key={change.id || `${change.creado_en}-${index}`}>
                    {new Date(change.creado_en).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} · {change.saliente} → {change.entrante} · {change.motivo_display}{change.detalle ? ` · ${change.detalle}` : ""} · por {change.origen === "capitan" ? "capitán" : change.realizado_por || "admin"}
                    {change.origen === "capitan" && <small className="badge-capitan">Capitán</small>}
                  </li>)}</ul>
                </details>}
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
        {(acceptingRegistrations || closed) && <form className="config-form" onSubmit={saveCapacity}>
          <h3>Cupo e inscripciones</h3>
          {warning && <p className="warning" role="status">{warning}</p>}
          <div className="inline-fields">
            <div className="field">
              <label htmlFor="tournament-capacity">Cupo de equipos</label>
              <input
                id="tournament-capacity"
                type="number"
                min={data?.cupo_equipos ?? data?.cupo ?? 1}
                required
                disabled={closed}
                value={capacityForm.cupo_equipos}
                aria-invalid={Boolean(capacityError)}
                onChange={(event) => setCapacityForm({ ...capacityForm, cupo_equipos: event.target.value })}
              />
              {capacityError && <p className="error" role="alert">{capacityError}</p>}
              {closed && (
                <p className="submit-hint">Reabre las inscripciones para ampliar el cupo.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="registration-deadline">Cierre de inscripciones</label>
              <input
                id="registration-deadline"
                type="datetime-local"
                disabled={closed}
                value={capacityForm.cierre_inscripciones?.slice(0, 16) || ""}
                onChange={(event) => setCapacityForm({ ...capacityForm, cierre_inscripciones: event.target.value })}
              />
            </div>
          </div>
          {acceptingRegistrations && <button type="submit" disabled={!data}>Guardar cupo y plazo</button>}
        </form>}
        <div className="draw-controls">
          {closed && <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyAccredited}
              onChange={(event) => setOnlyAccredited(event.target.checked)}
            />{" "}
            Sortear solo con equipos acreditados
          </label>}
          {acceptingRegistrations && (
            <button
              type="button"
              onClick={() => setDialog({
                type: "close",
                title: "¿Cerrar las inscripciones?",
                text: "Nadie más podrá inscribirse. Podrás reabrirlas antes de sortear si alguien alcanza a pedir un cupo.",
              })}
            >
              Cerrar inscripciones
            </button>
          )}
          {(acceptingRegistrations || closed) && <button
            disabled={!closed}
            onClick={() =>
              setDialog({
                type: "draw",
                title: "¿Sortear la llave?",
                text: "Se borrarán las partidas existentes. Esta acción no se puede deshacer.",
              })
            }
          >
            Sortear llave
          </button>}
          {acceptingRegistrations && (
            <p className="submit-hint">Primero debes cerrar las inscripciones para sortear la llave.</p>
          )}
          {closed && (
            <button className="secondary" type="button" onClick={() => changeTournamentState("reabrir-inscripciones")}>
              Reabrir inscripciones
            </button>
          )}
          {drawn && (
            <button
              className="secondary danger"
              type="button"
              onClick={() => setDialog({
                type: "unpublish",
                title: "¿Despublicar la llave?",
                text: "Se eliminará la llave y sus resultados para poder rehacer el proceso.",
              })}
            >
              Despublicar llave
            </button>
          )}
        </div>
      </section>

      <section>
        <h2>{bracketIsEditable ? "Llave editable" : "Llave finalizada"}</h2>
        <BracketLlave
          rondas={data?.rondas}
          renderEditor={bracketIsEditable ? resultEditor : undefined}
        />
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

      {replacement && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog replacement-dialog" role="dialog" aria-modal="true" aria-labelledby="replacement-title">
            <h2 id="replacement-title">Reemplazar a {replacement.integrante.nombre_completo || `${replacement.integrante.nombre || ""} ${replacement.integrante.apellido || ""}`.trim()}</h2>
            <p><strong>{replacement.team.nombre}</strong></p>
            <form onSubmit={submitReplacement}>
              <div className="field">
                <label htmlFor="candidate-search">Buscar comodín</label>
                <input id="candidate-search" autoFocus value={candidateQuery} onChange={(event) => { setCandidateQuery(event.target.value); setSelectedCandidate(null); setReplacementForm((current) => ({ ...current, forzar: false })); }} placeholder="Nombre, RUT o código" />
                <small>El comodín debe estar registrado en el evento. Si no lo está, regístralo primero en /registro.</small>
              </div>
              {candidateLoading && <p>Buscando…</p>}
              {candidates.length > 0 && <div className="candidatos-lista" role="listbox" aria-label="Candidatos">
                {candidates.map((candidate) => <button key={candidate.rut} type="button" role="option" aria-selected={selectedCandidate?.rut === candidate.rut} className={`secondary candidato ${selectedCandidate?.rut === candidate.rut ? "is-selected" : ""}`} onClick={() => {
                  setSelectedCandidate(candidate);
                  const candidateName = `${candidate.nombre || ""} ${candidate.apellido || ""}`.trim();
                  setReplacementForm((current) => ({ ...current, nombre_equipo: current.gamertag || candidateName, forzar: false }));
                }}>
                  <span>{candidate.nombre} {candidate.apellido} · {candidate.rut} · {[candidate.tipo, candidate.carrera_nombre].filter(Boolean).join(" / ") || "Sin información"}</span>
                  {candidate.conflicto_bloque && <small className="warning">Juega {candidate.conflicto_bloque} en el mismo bloque</small>}
                </button>)}
              </div>}
              <div className="field"><label htmlFor="replacement-gamertag">Gamertag (opcional)</label><input id="replacement-gamertag" value={replacementForm.gamertag} onChange={(event) => setReplacementForm({ ...replacementForm, gamertag: event.target.value, ...(data?.modalidad === "individual" ? { nombre_equipo: event.target.value || (selectedCandidate ? `${selectedCandidate.nombre} ${selectedCandidate.apellido}`.trim() : "") } : {}) })} /></div>
              <div className="field"><label htmlFor="replacement-reason">Motivo</label><select id="replacement-reason" value={replacementForm.motivo} onChange={(event) => setReplacementForm({ ...replacementForm, motivo: event.target.value })}><option value="no_se_presento">No se presentó</option><option value="problema">Problema en el momento</option><option value="otro">Otro</option></select></div>
              <div className="field"><label htmlFor="replacement-detail">Detalle (opcional)</label><textarea id="replacement-detail" maxLength="200" value={replacementForm.detalle} onChange={(event) => setReplacementForm({ ...replacementForm, detalle: event.target.value })} /></div>
              {data?.modalidad === "individual" && <div className="field"><label htmlFor="replacement-bracket-name">Nombre en la llave</label><input id="replacement-bracket-name" required value={replacementForm.nombre_equipo} onChange={(event) => setReplacementForm({ ...replacementForm, nombre_equipo: event.target.value })} /></div>}
              {selectedCandidate?.conflicto_bloque && <label className="checkbox warning"><input type="checkbox" checked={replacementForm.forzar} onChange={(event) => setReplacementForm({ ...replacementForm, forzar: event.target.checked })} /> Confirmo que no jugará en {selectedCandidate.conflicto_bloque}</label>}
              {replacement.integrante.es_capitan && <p className="info-notice">El comodín quedará como capitán.</p>}
              {replacementError && <p className="error" role="alert">{replacementError}</p>}
              <div className="actions"><button type="submit" disabled={!selectedCandidate || replacementSaving || (selectedCandidate.conflicto_bloque && !replacementForm.forzar)}>{replacementSaving ? "Guardando…" : "Confirmar reemplazo"}</button><button className="secondary" type="button" disabled={replacementSaving} onClick={() => setReplacement(null)}>Cancelar</button></div>
            </form>
          </section>
        </div>
      )}

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
                    : dialog.type === "close"
                      ? () => changeTournamentState("cerrar-inscripciones")
                      : dialog.type === "unpublish"
                        ? () => changeTournamentState("despublicar-llave")
                        : dialog.type === "correction-mode"
                          ? () => {
                              setCorrectionMode(true);
                              setDialog(null);
                            }
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

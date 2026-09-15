import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { apiErrorMessage } from "../api";
import { formatearRut, limpiarRut, rutValido } from "../utils/rut";

const emptyMembers = (amount) =>
  Array.from({ length: amount }, () => ({
    rut: "",
    gamertag: "",
    status: "idle",
  }));

function errorText(value) {
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    return errorText(value.detail || value.mensaje || value.message || Object.values(value));
  }
  return typeof value === "string" ? value : "";
}

function blockConflictErrors(data, members) {
  const conflicts = data.conflictos_bloque || data.conflictos ||
    (data.rut ? [{ rut: data.rut, detail: data.detail }] : []);
  const candidates = Array.isArray(conflicts) ? conflicts : [conflicts];
  const detail = errorText(data.detail);
  return members.map((member) => {
    const rut = limpiarRut(member.rut);
    const conflict = candidates.find((item) =>
      limpiarRut(item?.rut || "") === rut,
    );
    const message = errorText(conflict);
    if (message) return message;
    return detail && limpiarRut(detail).includes(rut)
      ? detail
      : "";
  });
}

export default function InscripcionTorneo() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState();
  const [team, setTeam] = useState("");
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/api/torneos/${slug}/`)
      .then(({ data }) => {
        setTournament(data);
        setMembers(emptyMembers(data.jugadores_por_equipo));
      })
      .catch((requestError) => {
        console.error("No pudimos cargar el torneo.", requestError);
        setErrors({
          general: apiErrorMessage(
            requestError,
            "No pudimos cargar el torneo.",
          ),
        });
      });
  }, [slug]);

  const individual =
    tournament?.modalidad === "individual" ||
    tournament?.jugadores_por_equipo === 1;
  const validMembers = members.filter(
    (member) => member.gamertag.trim() && member.status === "valid",
  ).length;
  const complete = Boolean(
    (individual || team.trim()) &&
    members.length &&
    validMembers === members.length,
  );
  const missing = useMemo(() => {
    if (!individual && !team.trim()) return "Falta el nombre del equipo.";
    const incomplete = members.length - validMembers;
    return incomplete
      ? `Falta validar ${incomplete} ${incomplete === 1 ? "integrante" : "integrantes"}.`
      : "";
  }, [individual, members.length, team, validMembers]);
  const sharedBlockNotice =
    tournament?.advertencia_bloque || tournament?.mensaje_bloque_compartido;
  const otherTournaments =
    tournament?.torneos_mismo_bloque || tournament?.torneos_en_bloque || [];
  const otherTournamentName =
    tournament?.torneo_en_conflicto?.nombre ||
    tournament?.torneo_en_conflicto ||
    tournament?.bloque_compartido?.otro_torneo ||
    tournament?.bloque_compartido?.torneo ||
    otherTournaments.map((item) => item.nombre || item).join(" y ");

  function updateMember(index, key, value) {
    setMembers((current) =>
      current.map((member, position) =>
        position === index
          ? {
              ...member,
              [key]: value,
              ...(key === "rut" ? { status: "idle", detail: "" } : {}),
            }
          : member,
      ),
    );
  }

  async function verifyMember(index) {
    const member = members[index];
    if (!rutValido(member.rut)) {
      setMembers((current) =>
        current.map((item, position) =>
          position === index
            ? { ...item, status: "invalid", detail: "Ingresa un RUT válido." }
            : item,
        ),
      );
      return;
    }
    setMembers((current) =>
      current.map((item, position) =>
        position === index ? { ...item, status: "checking", detail: "" } : item,
      ),
    );
    try {
      await api.post("/api/asistentes/verificar/", {
        rut: limpiarRut(member.rut),
      });
      setMembers((current) =>
        current.map((item, position) =>
          position === index ? { ...item, status: "valid" } : item,
        ),
      );
    } catch (requestError) {
      const detail =
        requestError.response?.data?.detail ||
        "Esta persona todavía no está registrada al evento.";
      setMembers((current) =>
        current.map((item, position) =>
          position === index ? { ...item, status: "invalid", detail } : item,
        ),
      );
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!complete) return;
    setBusy(true);
    setErrors({});
    const integrantes = members.map(({ rut, gamertag }) => ({
      rut: limpiarRut(rut),
      gamertag,
    }));
    try {
      const { data } = await api.post(`/api/torneos/${slug}/inscripcion/`, {
        nombre_equipo: individual ? members[0].gamertag : team,
        integrantes,
      });
      setDone(data);
    } catch (error) {
      console.error("No pudimos completar la inscripción.", error);
      const data = error.response?.data || {};
      const conflictErrors = blockConflictErrors(data, members);
      const hasBlockConflict = conflictErrors.some(Boolean);
      setErrors({
        general:
          hasBlockConflict
            ? ""
            : errorText(data.detail || data.non_field_errors) || "Revisa los datos.",
        integrantes: hasBlockConflict
          ? conflictErrors.map((message) => message && ({ rut: message }))
          : data.integrantes || data.errores_integrantes || [],
      });
    } finally {
      setBusy(false);
    }
  }

  if (!tournament && !errors.general) return <main>Cargando…</main>;
  if (done)
    return (
      <main>
        <h1>Inscripción lista</h1>
        {done.estado === "espera" ? (
          <p className="notice">
            Tu equipo quedó en lista de espera. Posición:{" "}
            <strong>{done.posicion_espera}</strong>.
          </p>
        ) : (
          <p className="success">Tu inscripción está confirmada.</p>
        )}
        <Link className="button" to={`/torneos/${slug}/llave`}>
          Ver llave
        </Link>
      </main>
    );

  return (
    <main>
      <h1>{tournament?.nombre || "Inscripción"}</h1>
      {(sharedBlockNotice || tournament?.bloque_compartido || tournament?.torneo_en_conflicto || otherTournaments.length > 0) && (
        <p className="warning shared-block-warning">
          <strong>Horario compartido.</strong>{" "}
          {sharedBlockNotice || <>Este torneo se juega a la misma hora que {otherTournamentName}. No se puede competir en los dos.</>}
        </p>
      )}
      <div className="tournament-signup-layout">
        <form className="team-form" onSubmit={submit}>
          {!individual && (
            <div className="signup-progress">
              <strong>
                {validMembers} de {members.length}
              </strong>
              <span> integrantes válidos</span>
              <progress max={members.length} value={validMembers} />
            </div>
          )}
          <p className="notice">
            <strong>Todos deben estar registrados al evento.</strong>{" "}
            <Link to="/registro" target="_blank" rel="noreferrer">
              Abrir registro
            </Link>
            .
          </p>
          {errors.general && (
            <p className="error" role="alert">
              {errors.general}
            </p>
          )}
          {!individual && (
            <div className="field">
              <label htmlFor="team-name">Nombre del equipo</label>
              <input
                id="team-name"
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                required
              />
            </div>
          )}
          {!individual && (
            <p className="captain-explanation">
              <span className="captain-badge">Capitán</span> Responde por el
              equipo y podrá modificarlo después.
            </p>
          )}
          <div className={`member-list ${individual ? "individual" : ""}`}>
            {members.map((member, index) => (
              <div className={`member-row ${member.status}`} key={index}>
                {!individual && (
                  <strong
                    className="member-number"
                    aria-label={`Integrante ${index + 1}`}
                  >
                    {index + 1}
                  </strong>
                )}
                <div className="field">
                  <label htmlFor={`rut-${index}`}>RUT</label>
                  <input
                    id={`rut-${index}`}
                    value={member.rut}
                    onChange={(event) =>
                      updateMember(
                        index,
                        "rut",
                        formatearRut(event.target.value),
                      )
                    }
                    onBlur={() => verifyMember(index)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`gamertag-${index}`}>Gamertag</label>
                  <input
                    id={`gamertag-${index}`}
                    value={member.gamertag}
                    onChange={(event) =>
                      updateMember(index, "gamertag", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="member-verification" role="status">
                  {member.status === "checking" && "Verificando…"}
                  {member.status === "valid" && (
                    <span className="verified">✓ Registrado</span>
                  )}
                  {member.status === "invalid" && (
                    <span className="error">
                      {member.detail}{" "}
                      <Link to="/registro" target="_blank">
                        Registrarse
                      </Link>
                    </span>
                  )}
                </div>
                {errors.integrantes?.[index] && (
                  <p className="error member-api-error">
                    {errors.integrantes[index].rut ||
                      errors.integrantes[index].gamertag}
                  </p>
                )}
              </div>
            ))}
          </div>
          {!complete && <p className="submit-hint">{missing}</p>}
          <button disabled={!complete || busy}>
            {busy ? "Enviando…" : "Enviar inscripción"}
          </button>
        </form>
        {tournament && (
          <aside className="tournament-rules">
            <h2>Reglas completas</h2>
            {Array.isArray(tournament.reglas) ? (
              <ol>
                {tournament.reglas.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ol>
            ) : (
              <p>{tournament.reglas}</p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

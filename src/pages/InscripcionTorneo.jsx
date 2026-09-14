import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

const emptyMembers = (amount) =>
  Array.from({ length: amount }, () => ({ rut: "", gamertag: "" }));

export default function InscripcionTorneo() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState();
  const [team, setTeam] = useState("");
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState();

  useEffect(() => {
    api
      .get(`/api/torneos/${slug}/`)
      .then(({ data }) => {
        setTournament(data);
        setMembers(emptyMembers(data.jugadores_por_equipo));
      })
      .catch(() => setErrors({ general: "No pudimos cargar el torneo." }));
  }, [slug]);

  const individual =
    tournament?.modalidad === "individual" ||
    tournament?.jugadores_por_equipo === 1;
  function updateMember(index, key, value) {
    setMembers(
      members.map((member, position) =>
        position === index ? { ...member, [key]: value } : member,
      ),
    );
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    const integrantes = individual ? [members[0]] : members;
    const nombreEquipo = individual ? members[0]?.gamertag : team;
    try {
      const { data } = await api.post(`/api/torneos/${slug}/inscripcion/`, {
        nombre_equipo: nombreEquipo,
        integrantes,
      });
      setDone(data);
    } catch (error) {
      const data = error.response?.data || {};
      const general =
        data.detail || data.non_field_errors?.[0] || "Revisa los datos.";
      const memberErrors = data.integrantes || data.errores_integrantes || [];
      if (typeof general === "string") {
        integrantes.forEach((member, index) => {
          if (member.rut && general.includes(member.rut))
            memberErrors[index] = { ...memberErrors[index], rut: general };
        });
      }
      setErrors({ general, integrantes: memberErrors });
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
      <p className="notice">
        <strong>
          Todos los integrantes deben estar registrados al evento previamente.
        </strong>{" "}
        <Link to="/registro" target="_blank" rel="noreferrer">
          Abrir registro en otra pestaña
        </Link>
        .
      </p>
      {errors.general && <p className="error">{errors.general}</p>}
      <form onSubmit={submit}>
        {!individual && (
          <div className="field">
            <label>Nombre del equipo</label>
            <input
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              required
            />
          </div>
        )}
        {!individual && <p>La primera persona será el capitán del equipo.</p>}
        {members.map((member, index) => (
          <fieldset className="card" key={index}>
            <legend>
              {individual
                ? "Jugador"
                : index === 0
                  ? "Capitán"
                  : `Integrante ${index + 1}`}
            </legend>
            <div className="field">
              <label>RUT</label>
              <input
                value={member.rut}
                onChange={(event) =>
                  updateMember(index, "rut", event.target.value)
                }
                required
              />
              {errors.integrantes?.[index]?.rut && (
                <p className="error">{errors.integrantes[index].rut}</p>
              )}
            </div>
            <div className="field">
              <label>Gamertag</label>
              <input
                value={member.gamertag}
                onChange={(event) =>
                  updateMember(index, "gamertag", event.target.value)
                }
                required
              />
              {errors.integrantes?.[index]?.gamertag && (
                <p className="error">{errors.integrantes[index].gamertag}</p>
              )}
            </div>
          </fieldset>
        ))}
        <button>Enviar inscripción</button>
      </form>
      {tournament && (
        <section>
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
        </section>
      )}
    </main>
  );
}

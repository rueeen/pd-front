import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api, { apiErrorMessage } from "../api";
import { MOSTRAR_COMPLETOS } from "../config/visibilidad";
import { formatearRut, limpiarRut, rutValido } from "../utils/rut";
export default function Pase() {
  const { codigo } = useParams(),
    loc = useLocation(),
    [p, setP] = useState(),
    [bad, setBad] = useState(false),
    [loadError, setLoadError] = useState(""),
    [copied, setCopied] = useState(false),
    [editing, setEditing] = useState(null),
    [dialog, setDialog] = useState(null),
    [operationError, setOperationError] = useState(null),
    [operationSuccess, setOperationSuccess] = useState(null),
    [processing, setProcessing] = useState(false),
    ref = useRef();
  const load = () =>
    api
      .get(`/api/pase/${codigo}/`)
      .then((r) => {
        setP(r.data);
        setBad(false);
        setLoadError("");
      })
      .catch((requestError) => {
        console.error("No pudimos cargar el pase.", requestError);
        if (requestError.response?.status === 404) setBad(true);
        else
          setLoadError(
            apiErrorMessage(requestError, "No pudimos cargar el pase."),
          );
      });
  useEffect(() => {
    load();
    // El código de la URL identifica el pase que se vuelve a cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);
  const url = `${location.origin}/pase/${codigo}`;
  function download() {
    const a = document.createElement("a");
    a.download = `pase-${codigo}.png`;
    a.href = ref.current.querySelector("canvas").toDataURL("image/png");
    a.click();
  }
  async function copyLink() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  const teamKey = (t) => t.equipo_id || t.slug;
  const failOperation = (t, requestError) => {
    console.error("No pudimos modificar el equipo.", requestError);
    setOperationError({
      key: teamKey(t),
      message: apiErrorMessage(
        requestError,
        "No pudimos modificar el equipo.",
      ),
    });
  };
  async function renombrarEquipo(t, nombre) {
    setOperationError(null);
    setProcessing(true);
    try {
      await api.patch(`/api/equipos/${t.equipo_id}/`, {
        codigo_capitan: codigo,
        nombre_equipo: nombre,
      });
      setEditing(null);
      await load();
    } catch (requestError) {
      failOperation(t, requestError);
    } finally {
      setProcessing(false);
    }
  }
  async function retirarEquipo(t) {
    setOperationError(null);
    setProcessing(true);
    try {
      await api.delete(`/api/equipos/${t.equipo_id}/`, {
        data: { codigo_capitan: codigo },
      });
      setDialog(null);
      await load();
    } catch (requestError) {
      failOperation(t, requestError);
      setDialog(null);
    } finally {
      setProcessing(false);
    }
  }
  async function reemplazarIntegrante(t, payload) {
    setOperationError(null);
    setProcessing(true);
    try {
      const response = await api.post(
        `/api/equipos/${t.equipo_id}/integrantes/`,
        { ...payload, codigo_capitan: codigo },
      );
      const entrant =
        response.data?.integrante || response.data?.comodin || response.data || {};
      const nombre =
        [entrant.nombre, entrant.apellido].filter(Boolean).join(" ") ||
        entrant.gamertag ||
        payload.gamertag ||
        "el comodín";
      const success = {
        key: teamKey(t),
        message: `Listo, ${nombre} entró como comodín.`,
      };
      setEditing(null);
      setOperationSuccess(success);
      setTimeout(
        () =>
          setOperationSuccess((current) =>
            current === success ? null : current,
          ),
        4000,
      );
      await load();
    } catch (requestError) {
      failOperation(t, requestError);
    } finally {
      setProcessing(false);
    }
  }
  if (bad)
    return (
      <main>
        <h1>Pase no encontrado</h1>
        <p>
          Revisa que el link esté completo. Si no funciona, puedes registrarte
          de nuevo.
        </p>
        <Link className="button" to="/registro">
          Ir al registro
        </Link>
      </main>
    );
  if (!p)
    return (
      <main>
        <p className={loadError ? "error" : undefined}>
          {loadError || "Cargando pase…"}
        </p>
      </main>
    );
  const n = p.completos_disponibles;
  const activeTournaments = (p.torneos || []).filter(
    (t) => !["retirado", "cancelado"].includes(t.torneo_estado),
  );
  const blockKey = (t) =>
    t.bloque_id || t.bloque_horario_id ||
    (typeof t.bloque_horario === "object"
      ? t.bloque_horario.id || t.bloque_horario.nombre
      : t.bloque_horario);
  const repeatedBlocks = new Set(
    activeTournaments
      .map(blockKey)
      .filter((key, index, keys) => key && keys.indexOf(key) !== index),
  );
  return (
    <main>
      <article className="pass pass-details">
        {loc.state?.recuperado && (
          <p className="notice">
            <strong>Registro listo.</strong> Recuperamos tu registro anterior.
          </p>
        )}
        <h1>
          {p.nombre} {p.apellido}
        </h1>
        {p.carrera_nombre && (
          <p className="person-career">{p.carrera_nombre}</p>
        )}
        <div className="qr" ref={ref}>
          <QRCodeCanvas value={url} size={260} level="M" marginSize={1} />
        </div>
        <p className="pass-code">{codigo}</p>
        <p>
          Este es tu pase de acceso a la jornada. Presenta el QR o el código
          para acreditarte en el evento.
        </p>
        {MOSTRAR_COMPLETOS && <p className={`balance ${n === 1 ? "one" : n === 0 ? "none" : ""}`}>
          {n === 2
            ? "2 completos disponibles"
            : n === 1
              ? "1 completo disponible"
              : "Ya retiraste tus 2 completos"}
        </p>}
        <div className="actions">
          <button onClick={download}>Descargar QR</button>
          <button className="secondary" onClick={copyLink}>
            Copiar link del pase
          </button>
        </div>
        {copied && (
          <p className="success" role="status">
            Link copiado
          </p>
        )}
        <p>
          Este link es permanente. Guárdalo para abrir tu pase desde cualquier
          dispositivo.
        </p>
        {p.torneos?.length > 0 && (
          <section className="pass-tournaments">
            <h2>Tus torneos</h2>
            <div className="pass-tournament-list">
              {p.torneos.map((t, i) => (
                <article
                  className="card pass-tournament"
                  key={t.equipo_id || t.slug || i}
                >
                  <h3>{t.nombre || t.torneo}</h3>
                  <p>
                    <span className="data-label">Bloque horario</span>{" "}
                    {t.bloque_horario || t.horario}
                  </p>
                  <p>
                    <span className="data-label">Equipo</span>{" "}
                    {typeof t.equipo === "string"
                      ? t.equipo
                      : t.equipo?.nombre}
                  </p>
                  <p
                    className={`team-status ${t.torneo_estado === "confirmado" ? "confirmed" : ""}`}
                  >
                    {t.torneo_estado === "espera"
                      ? `Lista de espera · posición ${t.posicion_espera}`
                      : t.torneo_estado === "confirmado"
                        ? "✓ Confirmado"
                        : t.torneo_estado}
                  </p>
                  {(t.conflicto_bloque || repeatedBlocks.has(blockKey(t))) && (
                    <p className="warning block-conflict" role="alert">
                      <strong>Conflicto de horario:</strong> estás inscrito en más de un torneo de este bloque. Resuélvelo con el coordinador.
                    </p>
                  )}
                  <h4>Compañeros</h4>
                  <ul className="pass-roster">
                    {(t.integrantes || t.equipo?.integrantes || []).map(
                      (member, index) => (
                        <li key={member.id || index}>
                          <span>
                            {[member.nombre, member.apellido]
                              .filter(Boolean)
                              .join(" ") ||
                              `Integrante ${index + 1}`}
                          </span>
                          <strong>{member.gamertag}</strong>
                        </li>
                      ),
                    )}
                  </ul>
                  <Link to={`/torneos/${t.slug}/llave`}>Ver llave pública</Link>
                  {operationError?.key === teamKey(t) && (
                    <p className="error" role="alert">
                      {operationError.message}
                    </p>
                  )}
                  {operationSuccess?.key === teamKey(t) && (
                    <p className="success" role="status">
                      {operationSuccess.message}
                    </p>
                  )}
                  {t.es_capitan &&
                    !t.puede_reemplazar &&
                    t.motivo_no_reemplazo && (
                      <p className="notice">
                        {t.motivo_no_reemplazo}
                        {String(t.modalidad).toLowerCase() === "individual" &&
                          " Habla con el coordinador del torneo."}
                      </p>
                    )}
                  {t.es_capitan &&
                    (t.puede_gestionar || t.puede_reemplazar) && (
                      <div className="team-management">
                        {t.puede_gestionar && (
                          <button
                            className="secondary"
                            type="button"
                            onClick={() =>
                              setEditing({
                                type: "name",
                                key: teamKey(t),
                                value:
                                  typeof t.equipo === "string"
                                    ? t.equipo
                                    : t.equipo?.nombre || "",
                              })
                            }
                          >
                            Cambiar nombre
                          </button>
                        )}
                        {t.puede_reemplazar && (
                          <div>
                            <button
                              className={
                                t.inscripciones_abiertas
                                  ? "secondary"
                                  : undefined
                              }
                              type="button"
                              onClick={() =>
                                setEditing({
                                  type: "member",
                                  key: teamKey(t),
                                  anterior: "",
                                  rut: "",
                                  codigoEntrante: "",
                                  gamertag: "",
                                  motivo: "no_se_presento",
                                  detalle: "",
                                  confirmado: false,
                                })
                              }
                            >
                              {t.inscripciones_abiertas
                                ? "Reemplazar integrante"
                                : "Ingresar comodín"}
                            </button>
                            {!t.inscripciones_abiertas && (
                              <small>
                                Te quedan {t.comodines_restantes} comodines
                              </small>
                            )}
                          </div>
                        )}
                        {t.puede_gestionar && (
                          <button
                            className="secondary danger"
                            type="button"
                            onClick={() => setDialog(t)}
                          >
                            Retirar equipo
                          </button>
                        )}
                      </div>
                    )}
                  {editing?.key === teamKey(t) && editing.type === "name" && (
                    <form
                      className="inline-management"
                      onSubmit={(event) => {
                        event.preventDefault();
                        renombrarEquipo(t, editing.value);
                      }}
                    >
                      <label>
                        Nuevo nombre
                        <input
                          value={editing.value}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              value: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <button disabled={processing}>Guardar nombre</button>
                    </form>
                  )}
                  {editing?.key === teamKey(t) && editing.type === "member" && (
                    <form
                      className="inline-management"
                      onSubmit={(event) => {
                        event.preventDefault();
                        reemplazarIntegrante(t, {
                          integrante_id: editing.anterior,
                          rut_entrante: limpiarRut(editing.rut),
                          codigo_entrante: editing.codigoEntrante,
                          gamertag: editing.gamertag,
                          motivo: editing.motivo,
                          detalle: editing.motivo === "otro" ? editing.detalle : "",
                        });
                      }}
                    >
                      <label>
                        Quién no llegó
                        <select
                          value={editing.anterior}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              anterior: event.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Selecciona</option>
                          {(t.integrantes || [])
                            .filter((member) => !member.es_capitan)
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {[member.nombre, member.apellido].filter(Boolean).join(" ")}
                                {member.gamertag ? ` (${member.gamertag})` : ""}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        RUT del comodín
                        <input
                          value={editing.rut}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              rut: formatearRut(event.target.value),
                            })
                          }
                          required
                        />
                        {editing.rut && !rutValido(editing.rut) && (
                          <small className="error">Ingresa un RUT válido.</small>
                        )}
                      </label>
                      {!t.inscripciones_abiertas && (
                        <label>
                          Código del pase del comodín
                          <input
                            value={editing.codigoEntrante}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                codigoEntrante: event.target.value
                                  .toUpperCase()
                                  .slice(0, 10),
                              })
                            }
                            minLength={10}
                            maxLength={10}
                            required
                          />
                          <small>
                            Pídele a tu comodín el código que aparece bajo su QR.
                            Debe estar registrado en el evento.
                          </small>
                        </label>
                      )}
                      <label>
                        Gamertag
                        <input
                          value={editing.gamertag}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              gamertag: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Motivo
                        <select
                          value={editing.motivo}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              motivo: event.target.value,
                            })
                          }
                        >
                          <option value="no_se_presento">No se presentó</option>
                          <option value="problema">Problema en el momento</option>
                          <option value="otro">Otro</option>
                        </select>
                      </label>
                      {editing.motivo === "otro" && (
                        <label>
                          Detalle
                          <input
                            value={editing.detalle}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                detalle: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                      )}
                      <label>
                        <input
                          type="checkbox"
                          checked={editing.confirmado}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              confirmado: event.target.checked,
                            })
                          }
                        />
                        Confirmo el cambio. Queda registrado y lo ve el
                        coordinador.
                      </label>
                      <button
                        disabled={
                          processing ||
                          !editing.confirmado ||
                          !rutValido(editing.rut)
                        }
                      >
                        {t.inscripciones_abiertas
                          ? "Guardar integrante"
                          : "Ingresar comodín"}
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </article>
      {dialog && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
          >
            <h2 id="withdraw-title">¿Retirar el equipo?</h2>
            <p>
              El cupo pasará al primer equipo de la lista de espera. Esta acción
              no se puede deshacer.
            </p>
            <div className="actions">
              <button
                className="danger"
                disabled={processing}
                onClick={() => retirarEquipo(dialog)}
              >
                Sí, retirar equipo
              </button>
              <button
                className="secondary"
                disabled={processing}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

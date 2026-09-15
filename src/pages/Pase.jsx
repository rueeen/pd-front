import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api, { apiErrorMessage } from "../api";
import { MOSTRAR_COMPLETOS } from "../config/visibilidad";
export default function Pase() {
  const { codigo } = useParams(),
    loc = useLocation(),
    [p, setP] = useState(),
    [bad, setBad] = useState(false),
    [loadError, setLoadError] = useState(""),
    [copied, setCopied] = useState(false),
    [editing, setEditing] = useState(null),
    [dialog, setDialog] = useState(null),
    [operationError, setOperationError] = useState(""),
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
  async function manage(slug, path, payload = {}) {
    setOperationError("");
    try {
      await api.patch(`/api/torneos/${slug}/equipo/${path}/`, {
        ...payload,
        codigo_capitan: codigo,
      });
      setEditing(null);
      setDialog(null);
      await load();
    } catch (requestError) {
      console.error("No pudimos modificar el equipo.", requestError);
      setOperationError(
        requestError.response?.data?.detail ||
          "No pudimos modificar el equipo.",
      );
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
    (t) => !["retirado", "cancelado"].includes(t.estado),
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
            {operationError && (
              <p className="error" role="alert">
                {operationError}
              </p>
            )}
            <div className="pass-tournament-list">
              {p.torneos.map((t, i) => (
                <article className="card pass-tournament" key={t.slug || i}>
                  <h3>{t.nombre || t.torneo}</h3>
                  <p>
                    <span className="data-label">Bloque horario</span>{" "}
                    {t.bloque_horario || t.horario}
                  </p>
                  <p>
                    <span className="data-label">Equipo</span>{" "}
                    {t.nombre_equipo || t.equipo?.nombre}
                  </p>
                  <p
                    className={`team-status ${t.estado === "confirmado" ? "confirmed" : ""}`}
                  >
                    {t.estado === "espera"
                      ? `Lista de espera · posición ${t.posicion_espera}`
                      : t.estado === "confirmado"
                        ? "✓ Confirmado"
                        : t.estado}
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
                            {member.nombre_completo ||
                              member.nombre ||
                              `Integrante ${index + 1}`}
                          </span>
                          <strong>{member.gamertag}</strong>
                        </li>
                      ),
                    )}
                  </ul>
                  <Link to={`/torneos/${t.slug}/llave`}>Ver llave pública</Link>
                  {t.es_capitan && (t.sorteado || t.llave_sorteada) && (
                    <p className="notice">
                      La llave ya se sorteó. Cualquier cambio debe verse con el
                      coordinador.
                    </p>
                  )}
                  {t.es_capitan &&
                    t.inscripciones_abiertas &&
                    !(t.sorteado || t.llave_sorteada) && (
                      <div className="team-management">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() =>
                            setEditing({
                              type: "name",
                              slug: t.slug,
                              value: t.nombre_equipo || t.equipo?.nombre || "",
                            })
                          }
                        >
                          Cambiar nombre
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() =>
                            setEditing({
                              type: "member",
                              slug: t.slug,
                              integrantes:
                                t.integrantes || t.equipo?.integrantes || [],
                              anterior: "",
                              rut: "",
                              gamertag: "",
                            })
                          }
                        >
                          Reemplazar integrante
                        </button>
                        <button
                          className="secondary danger"
                          type="button"
                          onClick={() => setDialog(t)}
                        >
                          Retirar equipo
                        </button>
                      </div>
                    )}
                  {editing?.slug === t.slug && editing.type === "name" && (
                    <form
                      className="inline-management"
                      onSubmit={(event) => {
                        event.preventDefault();
                        manage(t.slug, "nombre", {
                          nombre_equipo: editing.value,
                        });
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
                      <button>Guardar nombre</button>
                    </form>
                  )}
                  {editing?.slug === t.slug && editing.type === "member" && (
                    <form
                      className="inline-management"
                      onSubmit={(event) => {
                        event.preventDefault();
                        manage(t.slug, "integrante", {
                          integrante_id: editing.anterior,
                          rut: editing.rut,
                          gamertag: editing.gamertag,
                        });
                      }}
                    >
                      <label>
                        Integrante a reemplazar
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
                          {editing.integrantes
                            .filter((member) => !member.es_capitan)
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.gamertag}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        RUT del reemplazo
                        <input
                          value={editing.rut}
                          onChange={(event) =>
                            setEditing({ ...editing, rut: event.target.value })
                          }
                          required
                        />
                      </label>
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
                          required
                        />
                      </label>
                      <button>Guardar integrante</button>
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
                onClick={() => manage(dialog.slug, "retirar")}
              >
                Sí, retirar equipo
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

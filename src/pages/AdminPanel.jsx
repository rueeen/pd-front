import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
export default function AdminPanel() {
  const [d, setD] = useState(),
    [e, setE] = useState("");
  useEffect(() => {
    api
      .get("/api/admin/resumen/")
      .then((r) => {
        if (!Array.isArray(r.data?.inscritos_por_torneo)) {
          throw new TypeError("Los inscritos por torneo no son una lista.");
        }
        setD(r.data);
      })
      .catch((requestError) => {
        console.error("No se pudo cargar el resumen.", requestError);
        setD(undefined);
        setE("No se pudo cargar el resumen.");
      });
  }, []);
  return (
    <main>
      <h1>Panel del evento</h1>
      {e && <p className="error">{e}</p>}
      <div className="stats">
        <div className="stat">
          <b>{d?.total_registrados ?? "—"}</b>Registrados
        </div>
        <div className="stat">
          <b>{d?.completos_entregados ?? "—"}</b>Completos entregados
        </div>
        <div className="stat">
          <b>{d?.completos_pendientes ?? "—"}</b>Completos pendientes
        </div>
      </div>
      <h2>Accesos</h2>
      <div className="actions">
        <Link className="button" to="/admin/escaner">
          Abrir escáner
        </Link>
        {(d?.inscritos_por_torneo || []).map((t) => (
          <Link
            className="button secondary"
            key={t.slug}
            to={`/admin/torneos/${t.slug}`}
          >
            {t.nombre}: {t.inscritos} inscritos
          </Link>
        ))}
      </div>
      <h2>Aportes comprometidos</h2>
      <ul>
        {Object.entries(d?.aportes_comprometidos || {}).map(([k, v]) => (
          <li key={k}>
            {k}: <strong>{v}</strong>
          </li>
        ))}
      </ul>
    </main>
  );
}

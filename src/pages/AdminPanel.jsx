import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function SummaryTable({ title, rows, label }) {
  const normalized = Array.isArray(rows)
    ? rows.map((row) => ({
        name:
          row.nombre ??
          row[`${label}_nombre`] ??
          row[label] ??
          row.slug,
        count: row.cantidad ?? row.total ?? row.asistentes ?? row.conteo ?? 0,
      }))
    : Object.entries(rows || {}).map(([name, count]) => ({ name, count }));
  normalized.sort((a, b) => Number(b.count) - Number(a.count));

  return (
    <section className="summary-block">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>{label === "area" ? "Área" : "Carrera"}</th>
            <th>Asistentes</th>
          </tr>
        </thead>
        <tbody>
          {normalized.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.count}</td>
            </tr>
          ))}
          {!normalized.length && (
            <tr>
              <td colSpan="2">Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

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
    <main className="admin-page">
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
      <div className="summary-tables">
        <SummaryTable
          title="Asistentes por área"
          rows={d?.asistentes_por_area}
          label="area"
        />
        <SummaryTable
          title="Asistentes por carrera"
          rows={d?.asistentes_por_carrera}
          label="carrera"
        />
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

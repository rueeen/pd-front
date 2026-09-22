import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErrorMessage } from "../api";
import { MOSTRAR_COMPLETOS } from "../config/visibilidad";

const initialFilters = {
  q: "",
  tipo: "",
  area: "",
  carrera: "",
  torneo: "",
  orden: "reciente",
};

function requestParams(filters, query = filters.q) {
  return Object.fromEntries(
    Object.entries({ ...filters, q: query.trim() }).filter(([, value]) => value),
  );
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "—";
}

function formattedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
      });
}

export default function AdminInscritos() {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [summary, setSummary] = useState();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(filters.q), 300);
    return () => clearTimeout(timeout);
  }, [filters.q]);

  const params = useMemo(
    () => requestParams(filters, debouncedQuery),
    [
      debouncedQuery,
      filters.tipo,
      filters.area,
      filters.carrera,
      filters.torneo,
      filters.orden,
    ],
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    api
      .get("/api/admin/asistentes/", { params })
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new TypeError("La respuesta no es una lista.");
        }
        if (!ignore) setAttendees(data);
      })
      .catch((requestError) => {
        if (!ignore) {
          setAttendees([]);
          setError(
            apiErrorMessage(requestError, "No se pudieron cargar los inscritos."),
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [params, refreshKey]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get("/api/admin/resumen/"),
      api.get("/api/catalogo/areas/"),
    ])
      .then(([summaryResponse, catalogResponse]) => {
        if (ignore) return;
        setSummary(summaryResponse.data);
        setAreas(Array.isArray(catalogResponse.data) ? catalogResponse.data : []);
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(
            apiErrorMessage(
              requestError,
              "No se pudo cargar el resumen y los filtros.",
            ),
          );
        }
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const selectedArea = areas.find((area) => area.slug === filters.area);
  const tournaments = Array.isArray(summary?.inscritos_por_torneo)
    ? summary.inscritos_por_torneo
    : [];
  const hasActiveFilters = Boolean(
    filters.q.trim() ||
      filters.tipo ||
      filters.area ||
      filters.carrera ||
      filters.torneo,
  );

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "area" ? { carrera: "" } : {}),
    }));
  }

  async function downloadCsv() {
    setDownloading(true);
    setError("");
    try {
      const { data } = await api.get("/api/admin/asistentes/exportar/", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inscritos-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "No se pudo descargar el CSV."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="admin-page">
      <Link to="/admin">← Volver al panel</Link>
      <header className="page-header inscritos-header">
        <div>
          <h1>Inscritos</h1>
          <p>
            Mostrando {attendees.length} de {summary?.total_registrados ?? "—"}{" "}
            inscritos · cupo {summary?.cupo_asistentes ?? "—"}
          </p>
        </div>
        <div className="actions">
          <button
            className="secondary"
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Actualizar
          </button>
          <button
            type="button"
            disabled={loading || downloading}
            onClick={downloadCsv}
          >
            {downloading ? "Descargando…" : "Descargar CSV"}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="inscritos-filtros" aria-label="Filtros de inscritos">
        <label>
          Buscar
          <input
            type="search"
            value={filters.q}
            placeholder="Nombre, RUT, código o correo"
            onChange={(event) => updateFilter("q", event.target.value)}
          />
        </label>
        <label>
          Tipo
          <select
            value={filters.tipo}
            onChange={(event) => updateFilter("tipo", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="funcionario">Funcionario</option>
            <option value="externo">Externo</option>
          </select>
        </label>
        <label>
          Área
          <select
            value={filters.area}
            onChange={(event) => updateFilter("area", event.target.value)}
          >
            <option value="">Todas</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Carrera
          <select
            value={filters.carrera}
            disabled={!filters.area}
            onChange={(event) => updateFilter("carrera", event.target.value)}
          >
            <option value="">Todas</option>
            {(selectedArea?.carreras || []).map((career) => (
              <option key={career.slug} value={career.slug}>
                {career.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Torneo
          <select
            value={filters.torneo}
            onChange={(event) => updateFilter("torneo", event.target.value)}
          >
            <option value="">Todos</option>
            {tournaments.map((tournament) => (
              <option key={tournament.slug} value={tournament.slug}>
                {tournament.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orden
          <select
            value={filters.orden}
            onChange={(event) => updateFilter("orden", event.target.value)}
          >
            <option value="reciente">Más recientes</option>
            <option value="apellido">Apellido A–Z</option>
          </select>
        </label>
        <button
          className="secondary"
          type="button"
          onClick={() => setFilters(initialFilters)}
        >
          Limpiar filtros
        </button>
      </section>

      {loading ? (
        <p>Cargando inscritos…</p>
      ) : attendees.length === 0 ? (
        <p className="empty-state">
          {hasActiveFilters
            ? "No hay inscritos que coincidan con los filtros."
            : "Todavía no hay inscritos."}
        </p>
      ) : (
        <div className="table-scroll">
          <table className="inscritos-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Tipo</th>
                <th>Área / Carrera</th>
                <th>Contacto</th>
                <th>Torneos</th>
                <th>Inscripción</th>
                {MOSTRAR_COMPLETOS && <th>Completos</th>}
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee, index) => (
                <tr key={attendee.codigo}>
                  <td>{index + 1}</td>
                  <td>
                    {attendee.nombre} {attendee.apellido}
                    <small>{attendee.codigo}</small>
                    {attendee.en_padron && (
                      <span className="badge-padron">Padrón</span>
                    )}
                    <small>
                      <Link
                        to={`/pase/${attendee.codigo}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver pase
                      </Link>
                    </small>
                  </td>
                  <td>{attendee.rut || "—"}</td>
                  <td>{capitalize(attendee.tipo)}</td>
                  <td>
                    {attendee.area_nombre || "—"}
                    <small>{attendee.carrera_nombre || "—"}</small>
                  </td>
                  <td>
                    {attendee.email ? (
                      <a href={`mailto:${attendee.email}`}>{attendee.email}</a>
                    ) : (
                      "—"
                    )}
                    {attendee.telefono && <small>{attendee.telefono}</small>}
                  </td>
                  <td>
                    {attendee.torneos?.length
                      ? attendee.torneos.map((tournament) => (
                          <span className="chip" key={tournament.slug}>
                            {tournament.nombre}
                            {tournament.estado_equipo === "espera"
                              ? " (espera)"
                              : ""}
                          </span>
                        ))
                      : "—"}
                  </td>
                  <td>{formattedDate(attendee.creado_en)}</td>
                  {MOSTRAR_COMPLETOS && (
                    <td>
                      {attendee.completos_retirados} /{" "}
                      {attendee.completos_asignados}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

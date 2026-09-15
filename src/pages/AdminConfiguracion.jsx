import { useCallback, useEffect, useMemo, useState } from "react";
import api, { apiErrorMessage } from "../api";
import { MOSTRAR_COMPLETOS } from "../config/visibilidad";

const editableFields = [
  "cupo_asistentes",
  "registro_abierto",
  "completos_por_asistente",
  "mensaje_cupos_agotados",
  "registro_restringido",
  "areas_prioritarias",
];

const count = (value, ...keys) =>
  keys.reduce((found, key) => found ?? value?.[key], undefined) ?? 0;

function phaseName(form) {
  if (!form?.registro_restringido) return "Abierto a todos";
  return form.areas_prioritarias?.length
    ? "Prioridad por carrera"
    : "Solo alumnos del padrón";
}

function Breakdown({ title, rows }) {
  return (
    <section className="summary-block">
      <h3>{title}</h3>
      {rows?.length ? <div className="table-scroll"><table>
        <thead><tr><th>Nombre</th><th>Alumnos</th></tr></thead>
        <tbody>
          {[...rows]
            .sort((a, b) => count(b, "cantidad", "total") - count(a, "cantidad", "total"))
            .map((row, index) => (
              <tr key={row.slug ?? row.nombre ?? index}>
                <td>{row.nombre ?? row.area ?? row.carrera ?? "Sin información"}</td>
                <td>{count(row, "cantidad", "total")}</td>
              </tr>
            ))}
        </tbody>
      </table></div> : <p className="empty-state">Sin datos disponibles</p>}
    </section>
  );
}

export default function AdminConfiguracion() {
  const [configuration, setConfiguration] = useState();
  const [form, setForm] = useState();
  const [originalCompletes, setOriginalCompletes] = useState();
  const [applyExisting, setApplyExisting] = useState(false);
  const [dialog, setDialog] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [areas, setAreas] = useState([]);
  const [padron, setPadron] = useState();
  const [file, setFile] = useState();
  const [uploadMode, setUploadMode] = useState("agregar");
  const [replacementText, setReplacementText] = useState("");
  const [uploadResult, setUploadResult] = useState();
  const [emptyRestrictionConfirmed, setEmptyRestrictionConfirmed] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [{ data }, catalog, padronResponse] = await Promise.all([
        api.get("/api/admin/configuracion/"),
        api.get("/api/catalogo/areas/"),
        api.get("/api/admin/padron/"),
      ]);
      setConfiguration(data);
      setForm(Object.fromEntries(editableFields.map((key) => [
        key,
        key === "areas_prioritarias" ? (data[key] ?? []) : data[key],
      ])));
      setOriginalCompletes(data.completos_por_asistente);
      setApplyExisting(false);
      setEmptyRestrictionConfirmed(Boolean(data.registro_restringido));
      setAreas(Array.isArray(catalog.data) ? catalog.data : []);
      setPadron(padronResponse.data);
    } catch (requestError) {
      console.error("No se pudo cargar la configuración.", requestError);
      setError(apiErrorMessage(requestError, "No se pudo cargar la configuración del evento."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const padronTotal = count(padron, "total", "total_alumnos", "alumnos");
  const registeredFromPadron = count(
    padron,
    "registrados",
    "registrados_del_padron",
    "total_registrados",
  );
  const completesChanged = form && Number(form.completos_por_asistente) !== Number(originalCompletes);
  const belowRegistered = form && Number(form.cupo_asistentes) < Number(configuration?.registrados ?? configuration?.total_registrados);
  const replacementConfirmed = replacementText.trim().toUpperCase() === "REEMPLAZAR";

  async function save() {
    setDialog("");
    setBusy(true);
    setError("");
    setResult("");
    try {
      const payload = {
        ...form,
        cupo_asistentes: Number(form.cupo_asistentes),
        completos_por_asistente: Number(form.completos_por_asistente),
        ...(completesChanged ? { aplicar_a_registrados: applyExisting } : {}),
      };
      const { data } = await api.patch("/api/admin/configuracion/", payload);
      const skipped = data.no_actualizados ?? data.sin_actualizar ?? data.asistentes_no_actualizados;
      setResult(applyExisting
        ? `Configuración guardada. ${skipped ?? 0} asistentes quedaron sin actualizar por haber retirado más completos que el nuevo saldo.`
        : "Configuración guardada.");
      await load();
    } catch (requestError) {
      console.error("No se pudo guardar la configuración.", requestError);
      setError(apiErrorMessage(requestError, "No se pudo guardar la configuración."));
    } finally { setBusy(false); }
  }

  function submit(event) {
    event.preventDefault();
    if (form.registro_restringido && padronTotal === 0 && !emptyRestrictionConfirmed)
      setDialog("empty-padron");
    else if (completesChanged && applyExisting) setDialog("balances");
    else save();
  }

  const change = ({ target }) => setForm((current) => ({
    ...current,
    [target.name]: target.type === "checkbox" ? target.checked : target.value,
  }));

  function toggleArea(slug) {
    setForm((current) => ({
      ...current,
      areas_prioritarias: current.areas_prioritarias.includes(slug)
        ? current.areas_prioritarias.filter((item) => item !== slug)
        : [...current.areas_prioritarias, slug],
    }));
  }

  function changeRestriction(checked) {
    if (checked && padronTotal === 0 && !emptyRestrictionConfirmed) {
      setDialog("empty-padron");
      return;
    }
    setForm((current) => ({ ...current, registro_restringido: checked }));
  }

  function confirmDialog() {
    if (dialog === "empty-padron") {
      setEmptyRestrictionConfirmed(true);
      setForm((current) => ({ ...current, registro_restringido: true }));
      setDialog("");
    } else save();
  }

  async function downloadTemplate() {
    setBusy(true);
    setError("");
    try {
      const response = await api.get("/api/admin/padron/plantilla/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-padron.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "No se pudo descargar la plantilla."));
    } finally { setBusy(false); }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("archivo", file);
      body.append("modo", uploadMode);
      const { data } = await api.post("/api/admin/padron/", body);
      setUploadResult(data);
      setFile(undefined);
      setReplacementText("");
      event.currentTarget.reset();
      await load();
    } catch (requestError) {
      const data = requestError.response?.data;
      if (data && typeof data === "object" && (data.errores || data.importados !== undefined))
        setUploadResult(data);
      else setError(apiErrorMessage(requestError, "No se pudo procesar el archivo."));
    } finally { setBusy(false); }
  }

  const breakdowns = useMemo(() => ({
    areas: padron?.por_area ?? padron?.desglose_areas ?? [],
    careers: padron?.por_carrera ?? padron?.desglose_carreras ?? [],
  }), [padron]);

  return (
    <main className="admin-page">
      <p className="eyebrow">Administración</p>
      <h1>Configuración del evento</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="stats" aria-label={MOSTRAR_COMPLETOS ? "Resumen de cupos y completos" : "Resumen de cupos"}>
        <div className="stat"><b>{configuration?.registrados ?? configuration?.total_registrados ?? "—"}</b>Registrados</div>
        <div className="stat"><b>{configuration?.cupos_disponibles ?? "—"}</b>Cupos disponibles</div>
        {MOSTRAR_COMPLETOS && <div className="stat"><b>{configuration?.completos_comprometidos ?? "—"}</b>Completos comprometidos</div>}
      </div>
      {form && (
        <form className="config-form" onSubmit={submit}>
          {belowRegistered && <p className="warning" role="status">El cupo queda por debajo de los asistentes registrados. Nadie será desinscrito y el registro quedará cerrado de hecho hasta que el cupo suba.</p>}
          <div className="field"><label htmlFor="cupo_asistentes">Cupo de asistentes</label><input id="cupo_asistentes" name="cupo_asistentes" type="number" min="0" required value={form.cupo_asistentes} onChange={change} /></div>
          <label className="checkbox"><input name="registro_abierto" type="checkbox" checked={Boolean(form.registro_abierto)} onChange={change} />Registro abierto</label>
          {MOSTRAR_COMPLETOS && <div className="field"><label htmlFor="completos_por_asistente">Completos por asistente</label><input id="completos_por_asistente" name="completos_por_asistente" type="number" min="0" required value={form.completos_por_asistente} onChange={change} /></div>}
          {MOSTRAR_COMPLETOS && completesChanged && <label className="checkbox"><input type="checkbox" checked={applyExisting} onChange={(event) => setApplyExisting(event.target.checked)} />Aplicar a los ya registrados</label>}
          <div className="field"><label htmlFor="mensaje_cupos_agotados">Mensaje de cupos agotados</label><textarea id="mensaje_cupos_agotados" name="mensaje_cupos_agotados" required value={form.mensaje_cupos_agotados} onChange={change} /></div>
          <button disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</button>
        </form>
      )}
      {result && <p className="success" role="status">{result}</p>}

      {form && <section className="padron-panel" aria-labelledby="padron-title">
        <div className="section-heading"><div><p className="eyebrow">Registro por fases</p><h2 id="padron-title">Padrón de alumnos</h2></div><button type="button" className="secondary" disabled={busy} onClick={downloadTemplate}>Descargar plantilla</button></div>
        <p className="padron-status"><strong>{padronTotal}</strong> alumnos en el padrón <span>·</span> <strong>{registeredFromPadron}</strong> registrados provienen de él <span>·</span> Fase: <strong>{phaseName(form)}</strong></p>
        <label className="checkbox restriction-switch"><input type="checkbox" checked={Boolean(form.registro_restringido)} onChange={(event) => changeRestriction(event.target.checked)} />Restringir temporalmente el registro de estudiantes</label>
        {form.registro_restringido && <fieldset className="priority-areas"><legend>Áreas prioritarias</legend><p>Sin áreas seleccionadas, podrán registrarse todos los alumnos incluidos en el padrón.</p>{areas.map((area) => <label className="checkbox" key={area.slug}><input type="checkbox" checked={form.areas_prioritarias.includes(area.slug)} onChange={() => toggleArea(area.slug)} />{area.nombre}</label>)}</fieldset>}
        <button type="button" disabled={busy} onClick={submit}>Guardar fase de registro</button>

        <form className="padron-upload" onSubmit={upload}>
          <h3>Cargar padrón</h3>
          <div className="field"><label htmlFor="padron-file">Archivo Excel</label><input id="padron-file" type="file" accept=".xlsx" required onChange={(event) => setFile(event.target.files[0])} /></div>
          <fieldset><legend>Modo de carga</legend><div className="mode-options"><label className="checkbox"><input type="radio" name="modo" checked={uploadMode === "agregar"} onChange={() => setUploadMode("agregar")} />Agregar</label><label className="checkbox"><input type="radio" name="modo" checked={uploadMode === "reemplazar"} onChange={() => setUploadMode("reemplazar")} />Reemplazar</label></div><p><strong>Agregar</strong> conserva el padrón actual y suma o actualiza filas. <strong>Reemplazar</strong> sustituye todo el padrón solo si el archivo completo es válido.</p></fieldset>
          {uploadMode === "reemplazar" && <div className="field replacement-confirm"><label htmlFor="replacement-confirm">Escribe <strong>REEMPLAZAR</strong> para confirmar</label><input id="replacement-confirm" value={replacementText} onChange={(event) => setReplacementText(event.target.value)} autoComplete="off" /></div>}
          <button disabled={busy || !file || (uploadMode === "reemplazar" && !replacementConfirmed)}>{busy ? "Procesando…" : "Cargar archivo"}</button>
        </form>

        {uploadResult && <section className="upload-result" aria-live="polite">
          <div className="section-heading"><h3>Resultado de la carga</h3><button type="button" className="secondary" onClick={() => setUploadResult(undefined)}>Descartar</button></div>
          <div className="upload-counts"><span><strong>{count(uploadResult, "importados", "creados")}</strong> importados</span><span><strong>{count(uploadResult, "actualizados")}</strong> actualizados</span><span><strong>{count(uploadResult, "omitidos")}</strong> omitidos</span></div>
          {uploadResult.errores?.length > 0 && <><div className="error-table-scroll"><table><thead><tr><th>Fila</th><th>RUT</th><th>Motivo</th></tr></thead><tbody>{uploadResult.errores.map((item, index) => <tr key={`${item.fila}-${index}`}><td>{item.fila}</td><td>{item.rut || "—"}</td><td>{item.motivo ?? item.error}</td></tr>)}</tbody></table></div>{count(uploadResult, "total_errores", "cantidad_errores") > uploadResult.errores.length && <p>Se muestran {uploadResult.errores.length} de {count(uploadResult, "total_errores", "cantidad_errores")} errores.</p>}</>}
        </section>}
        <div className="summary-tables"><Breakdown title="Alumnos por área" rows={breakdowns.areas} /><Breakdown title="Alumnos por carrera" rows={breakdowns.careers} /></div>
      </section>}

      {dialog && <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="config-dialog-title"><h2 id="config-dialog-title">{dialog === "empty-padron" ? "¿Restringir con el padrón vacío?" : "¿Actualizar todos los saldos?"}</h2><p>{dialog === "empty-padron" ? "Nadie podrá registrarse como estudiante hasta que cargues un archivo al padrón." : "Esta acción modifica el saldo de completos de todos los asistentes ya registrados."}</p><div className="actions"><button onClick={confirmDialog}>{dialog === "empty-padron" ? "Sí, activar restricción" : "Sí, guardar y actualizar"}</button><button className="secondary" onClick={() => setDialog("")}>Cancelar</button></div></section></div>}
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";
import api, { apiErrorMessage } from "../api";

const editableFields = [
  "cupo_asistentes",
  "registro_abierto",
  "completos_por_asistente",
  "mensaje_cupos_agotados",
];

export default function AdminConfiguracion() {
  const [configuration, setConfiguration] = useState();
  const [form, setForm] = useState();
  const [originalCompletes, setOriginalCompletes] = useState();
  const [applyExisting, setApplyExisting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/api/admin/configuracion/");
      setConfiguration(data);
      setForm(Object.fromEntries(editableFields.map((key) => [key, data[key]])));
      setOriginalCompletes(data.completos_por_asistente);
      setApplyExisting(false);
    } catch (requestError) {
      console.error("No se pudo cargar la configuración.", requestError);
      setError(
        apiErrorMessage(
          requestError,
          "No se pudo cargar la configuración del evento.",
        ),
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completesChanged =
    form && Number(form.completos_por_asistente) !== Number(originalCompletes);
  const belowRegistered =
    form &&
    Number(form.cupo_asistentes) <
      Number(configuration?.registrados ?? configuration?.total_registrados);

  async function save() {
    setDialogOpen(false);
    setBusy(true);
    setError("");
    setResult("");
    try {
      const payload = {
        ...form,
        cupo_asistentes: Number(form.cupo_asistentes),
        completos_por_asistente: Number(form.completos_por_asistente),
        ...(completesChanged
          ? { aplicar_a_registrados: applyExisting }
          : {}),
      };
      const { data } = await api.patch("/api/admin/configuracion/", payload);
      const skipped =
        data.no_actualizados ?? data.sin_actualizar ?? data.asistentes_no_actualizados;
      setResult(
        applyExisting
          ? `Configuración guardada. ${skipped ?? 0} asistentes quedaron sin actualizar por haber retirado más completos que el nuevo saldo.`
          : "Configuración guardada.",
      );
      await load();
    } catch (requestError) {
      console.error("No se pudo guardar la configuración.", requestError);
      setError(
        requestError.response?.data?.detail ||
          "No se pudo guardar la configuración.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (completesChanged && applyExisting) setDialogOpen(true);
    else save();
  }

  const change = ({ target }) =>
    setForm((current) => ({
      ...current,
      [target.name]:
        target.type === "checkbox" ? target.checked : target.value,
    }));

  return (
    <main className="admin-page">
      <p className="eyebrow">Administración</p>
      <h1>Configuración del evento</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="stats" aria-label="Resumen de cupos y completos">
        <div className="stat"><b>{configuration?.registrados ?? configuration?.total_registrados ?? "—"}</b>Registrados</div>
        <div className="stat"><b>{configuration?.cupos_disponibles ?? "—"}</b>Cupos disponibles</div>
        <div className="stat"><b>{configuration?.completos_comprometidos ?? "—"}</b>Completos comprometidos</div>
      </div>
      {form && (
        <form className="config-form" onSubmit={submit}>
          {belowRegistered && (
            <p className="warning" role="status">
              El cupo queda por debajo de los asistentes registrados. Nadie será
              desinscrito y el registro quedará cerrado de hecho hasta que el cupo suba.
            </p>
          )}
          <div className="field">
            <label htmlFor="cupo_asistentes">Cupo de asistentes</label>
            <input id="cupo_asistentes" name="cupo_asistentes" type="number" min="0" required value={form.cupo_asistentes} onChange={change} />
          </div>
          <label className="checkbox">
            <input name="registro_abierto" type="checkbox" checked={Boolean(form.registro_abierto)} onChange={change} />
            Registro abierto
          </label>
          <div className="field">
            <label htmlFor="completos_por_asistente">Completos por asistente</label>
            <input id="completos_por_asistente" name="completos_por_asistente" type="number" min="0" required value={form.completos_por_asistente} onChange={change} />
          </div>
          {completesChanged && (
            <label className="checkbox">
              <input type="checkbox" checked={applyExisting} onChange={(event) => setApplyExisting(event.target.checked)} />
              Aplicar a los ya registrados
            </label>
          )}
          <div className="field">
            <label htmlFor="mensaje_cupos_agotados">Mensaje de cupos agotados</label>
            <textarea id="mensaje_cupos_agotados" name="mensaje_cupos_agotados" required value={form.mensaje_cupos_agotados} onChange={change} />
          </div>
          <button disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</button>
        </form>
      )}
      {result && <p className="success" role="status">{result}</p>}
      {dialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="config-dialog-title">
            <h2 id="config-dialog-title">¿Actualizar todos los saldos?</h2>
            <p>Esta acción modifica el saldo de completos de todos los asistentes ya registrados.</p>
            <div className="actions">
              <button onClick={save}>Sí, guardar y actualizar</button>
              <button className="secondary" onClick={() => setDialogOpen(false)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

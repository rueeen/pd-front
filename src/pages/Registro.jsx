import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { MOSTRAR_APORTE_COLABORATIVO } from "../config/visibilidad";
import { avisoEtapaRegistro } from "../utils/areasPrioritarias";
import { formatearRut, limpiarRut, rutValido } from "../utils/rut";

const initialForm = {
  nombre: "",
  apellido: "",
  rut: "",
  email: "",
  telefono: "",
  tipo: "",
  area: "",
  carrera: "",
  aporte: "ninguno",
};
const renderedFields = new Set(Object.keys(initialForm));

export default function Registro() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [areas, setAreas] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [configuration, setConfiguration] = useState();
  const [recoveredFields, setRecoveredFields] = useState(new Set());
  const [lastPadronRut, setLastPadronRut] = useState("");
  const navigate = useNavigate();

  const loadCatalog = useCallback(async (retry = true) => {
    setCatalogStatus("loading");
    try {
      const { data } = await api.get("/api/catalogo/areas/");
      if (!Array.isArray(data))
        throw new TypeError("El catálogo no es una lista.");
      setAreas(data);
      setCatalogStatus("ready");
    } catch (requestError) {
      if (retry) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return loadCatalog(false);
      }
      console.error("No pudimos cargar el catálogo de áreas.", requestError);
      setAreas([]);
      setCatalogStatus("error");
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    api
      .get("/api/configuracion/")
      .then(({ data }) => setConfiguration(data))
      .catch((requestError) =>
        console.error("No pudimos cargar la disponibilidad.", requestError),
      );
  }, [loadCatalog]);

  const unavailable =
    configuration &&
    (!configuration.registro_abierto || configuration.cupos_disponibles <= 0);

  async function lookupPadron() {
    if (form.tipo !== "estudiante" || !rutValido(form.rut)) return;
    const rut = limpiarRut(form.rut);
    if (rut === lastPadronRut) return;
    setLastPadronRut(rut);
    try {
      const { data } = await api.get(`/api/padron/${encodeURIComponent(rut)}/`);
      const recovered = {
        nombre: data.nombre ?? "",
        apellido: data.apellido ?? "",
        area: data.area?.slug ?? data.area ?? "",
        carrera: data.carrera?.slug ?? data.carrera ?? "",
      };
      const present = Object.keys(recovered).filter((key) => recovered[key]);
      setForm((current) => ({ ...current, ...recovered }));
      setRecoveredFields(new Set(present));
      setErrors((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !present.includes(key)),
      ));
    } catch (requestError) {
      setRecoveredFields(new Set());
      if (requestError.response?.status !== 404)
        console.error("No pudimos consultar el padrón.", requestError);
    }
  }

  const change = (event) => {
    const { name } = event.target;
    const value =
      name === "rut" ? formatearRut(event.target.value) : event.target.value;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "area" ? { carrera: "" } : {}),
    }));
    if (["nombre", "apellido", "area", "carrera"].includes(name))
      setRecoveredFields((current) => {
        const next = new Set(current);
        next.delete(name);
        if (name === "area") next.delete("carrera");
        return next;
      });
    if (name === "rut" || (name === "tipo" && value !== "estudiante")) {
      setLastPadronRut("");
      setRecoveredFields(new Set());
    }
    setErrors((current) => {
      const next = { ...current, [name]: undefined };
      if (name === "area") next.carrera = undefined;
      if (name === "tipo") {
        if (value === "estudiante") {
          if (!form.area)
            next.area = "El área es obligatoria para estudiantes.";
          if (!form.carrera)
            next.carrera = "La carrera es obligatoria para estudiantes.";
        } else {
          next.area = undefined;
          next.carrera = undefined;
        }
      }
      return next;
    });
  };

  async function submit(event) {
    event.preventDefault();
    const validation = {};
    ["nombre", "apellido", "email", "tipo"].forEach((key) => {
      if (!form[key]) validation[key] = "Completa este campo.";
    });
    if (form.tipo === "estudiante") {
      if (!form.area)
        validation.area = "El área es obligatoria para estudiantes.";
      if (!form.carrera)
        validation.carrera = "La carrera es obligatoria para estudiantes.";
      if (catalogStatus !== "ready")
        validation.area =
          "Necesitas cargar el catálogo para registrarte como estudiante.";
    }
    if (!rutValido(form.rut))
      validation.rut = "Ingresa un RUT válido con su dígito verificador.";
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email))
      validation.email = "Ingresa un correo válido.";
    if (Object.keys(validation).length) return setErrors(validation);

    setBusy(true);
    setErrors({});
    try {
      const { data } = await api.post("/api/asistentes/", {
        ...form,
        rut: limpiarRut(form.rut),
      });
      navigate(`/pase/${data.codigo}/`, {
        state: { recuperado: data.recuperado },
      });
    } catch (error) {
      console.error("No pudimos completar el registro.", error);
      const responseErrors = error.response?.data;
      if (error.response?.status === 403 && form.tipo === "estudiante") {
        setErrors({
          rut: responseErrors?.detail || "No pudimos completar el registro en esta etapa.",
          restriction: "Vuelve a intentarlo cuando se amplíen las inscripciones.",
        });
      } else if (error.response?.status === 409) {
        setErrors({
          capacity:
            responseErrors?.detail || "No pudimos completar el registro.",
        });
      } else if (responseErrors && typeof responseErrors === "object") {
        const unknown = Object.entries(responseErrors).filter(
          ([key]) => !renderedFields.has(key) && key !== "detail",
        );
        setErrors({
          ...responseErrors,
          general:
            responseErrors.detail ||
            (unknown.length
              ? unknown
                  .map(
                    ([key, value]) =>
                      `${key}: ${Array.isArray(value) ? value.join(" ") : value}`,
                  )
                  .join(" ")
              : undefined),
        });
      } else {
        setErrors({
          general:
            "No pudimos completar el registro. Revisa los datos e intenta nuevamente.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    ["nombre", "Nombre"],
    ["apellido", "Apellido"],
    ["rut", "RUT"],
    ["email", "Correo"],
    ["telefono", "Teléfono (opcional)"],
  ];
  const message = (key) =>
    Array.isArray(errors[key]) ? errors[key][0] : errors[key];
  const student = form.tipo === "estudiante";
  const restricted = student && Boolean(configuration?.registro_restringido);
  const restrictionNotice = restricted
    ? avisoEtapaRegistro(configuration)
    : "";
  const selectedArea = areas.find((area) => area.slug === form.area);
  const careers = selectedArea?.carreras || [];

  return (
    <main>
      <h1>Registro al evento</h1>
      <p className="lead">
        Registro gratuito. Al terminar recibirás tu pase con QR.
      </p>
      {restricted && (
        <p className="notice restriction-notice" role="status">
          {restrictionNotice}
        </p>
      )}
      {errors.general && <p className="error">{errors.general}</p>}
      {(unavailable || errors.capacity) && (
        <div className="notice availability-closed" role="alert">
          <p>
            {errors.capacity || configuration?.mensaje_cupos_agotados ||
              "El registro no está disponible."}
          </p>
          <Link to="/mi-pase">Ya me inscribí: abrir mi pase</Link>
        </div>
      )}
      <form onSubmit={submit} noValidate aria-disabled={Boolean(unavailable)}>
        <fieldset disabled={Boolean(unavailable)}>
        {fields.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              name={key}
              value={form[key]}
              onChange={change}
              onBlur={key === "rut" ? lookupPadron : undefined}
              aria-invalid={Boolean(errors[key])}
            />
            {recoveredFields.has(key) && <small className="recovered-mark">Recuperado del padrón; puedes editarlo.</small>}
            {errors[key] && <p className="error">{message(key)}</p>}
            {key === "rut" && errors.restriction && (
              <p className="restriction-return">
                {errors.restriction}{" "}
                <Link to="/mi-pase">Si ya te registraste, abre tu pase.</Link>
              </p>
            )}
          </div>
        ))}
        <div className="field">
          <label htmlFor="tipo">Tipo de asistente</label>
          <select id="tipo" name="tipo" value={form.tipo} onChange={change} onBlur={lookupPadron}>
            <option value="">Selecciona</option>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="funcionario">Funcionario</option>
            <option value="externo">Externo</option>
          </select>
          {errors.tipo && <p className="error">{message("tipo")}</p>}
        </div>
        <div className="field">
          <label htmlFor="area">Área{student ? "" : " (opcional)"}</label>
          <select
            id="area"
            name="area"
            value={form.area}
            onChange={change}
            disabled={catalogStatus !== "ready"}
            aria-invalid={Boolean(errors.area)}
          >
            <option value="">
              {catalogStatus === "loading"
                ? "Cargando áreas"
                : "Selecciona un área"}
            </option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.nombre}
              </option>
            ))}
          </select>
          {errors.area && <p className="error">{message("area")}</p>}
          {recoveredFields.has("area") && <small className="recovered-mark">Recuperado del padrón; puedes editarlo.</small>}
        </div>
        <div className="field">
          <label htmlFor="carrera">Carrera{student ? "" : " (opcional)"}</label>
          <select
            id="carrera"
            name="carrera"
            value={form.carrera}
            onChange={change}
            disabled={catalogStatus !== "ready" || !form.area}
            aria-invalid={Boolean(errors.carrera)}
          >
            <option value="">
              {!form.area ? "Primero elige un área" : "Selecciona una carrera"}
            </option>
            {careers.map((career) => (
              <option key={career.slug} value={career.slug}>
                {career.nombre}
              </option>
            ))}
          </select>
          {errors.carrera && <p className="error">{message("carrera")}</p>}
          {recoveredFields.has("carrera") && <small className="recovered-mark">Recuperado del padrón; puedes editarlo.</small>}
        </div>
        {catalogStatus === "error" && (
          <div className="notice catalog-notice" role="alert">
            <p>
              No pudimos cargar las áreas y carreras. Puedes continuar sin estos
              datos si no eres estudiante.
            </p>
            {student && (
              <p>
                Como estudiante, necesitas cargar el catálogo para registrarte.
              </p>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => loadCatalog()}
            >
              Reintentar
            </button>
          </div>
        )}
        {MOSTRAR_APORTE_COLABORATIVO && <div className="field">
          <label htmlFor="aporte">Aporte colaborativo opcional</label>
          <select
            id="aporte"
            name="aporte"
            value={form.aporte}
            onChange={change}
          >
            <option value="ninguno">Prefiero no llevar nada</option>
            <option value="bebida">Bebida</option>
            <option value="snack">Snack</option>
            <option value="galletas">Galletas</option>
            <option value="desechables">Desechables</option>
          </select>
        </div>}
        <button disabled={busy || unavailable}>{busy ? "Registrando…" : "Registrarme"}</button>
        </fieldset>
      </form>
    </main>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { formatearRut, limpiarRut } from "../utils/rut";

export default function MiPase() {
  const [form, setForm] = useState({ rut: "", email: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/api/pase/recuperar/", {
        rut: limpiarRut(form.rut),
        email: form.email,
      });
      navigate(`/pase/${data.codigo}`);
    } catch (requestError) {
      console.error("No pudimos recuperar el pase.", requestError);
      setError(
        requestError.response?.status === 404
          ? requestError.response.data?.detail
          : "No pudimos recuperar tu pase. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">Acceso personal</p>
      <h1>Mi pase</h1>
      <p className="lead">
        Recupera el enlace permanente de tu pase con los datos de tu registro.
      </p>
      {error && (
        <div className="notice" role="alert">
          <p className="error">{error}</p>
          <Link to="/registro">Registrarme al evento</Link>
        </div>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="recover-rut">RUT</label>
          <input
            id="recover-rut"
            value={form.rut}
            onChange={(event) =>
              setForm({ ...form, rut: formatearRut(event.target.value) })
            }
            required
          />
        </div>
        <div className="field">
          <label htmlFor="recover-email">Correo</label>
          <input
            id="recover-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />
        </div>
        <button disabled={busy}>
          {busy ? "Buscando…" : "Recuperar mi pase"}
        </button>
      </form>
    </main>
  );
}

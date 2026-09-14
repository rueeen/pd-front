import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import api from "../api";

export default function AdminEscaner() {
  const video = useRef();
  const controls = useRef();
  const lock = useRef(false);
  const lookupSource = useRef();
  const flashTimer = useRef();
  const mounted = useRef(true);
  const deniedRef = useRef(false);
  const [camera, setCamera] = useState(false);
  const [denied, setDenied] = useState(false);
  const [code, setCode] = useState("");
  const [person, setPerson] = useState();
  const [error, setError] = useState("");
  const [flash, setFlash] = useState();
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(flashTimer.current);
      controls.current?.stop();
    };
  }, []);
  function extract(text) {
    try {
      return (
        new URL(text).pathname.match(/\/pase\/([^/]+)/)?.[1] || text.trim()
      );
    } catch {
      return text.trim();
    }
  }
  async function lookup(raw, source) {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      const codigo = extract(raw);
      const response = await api.get(`/api/admin/asistentes/${codigo}/`);
      lookupSource.current = source;
      setPerson({ ...response.data, codigo });
      controls.current?.stop();
      setCamera(false);
    } catch {
      setError("No encontramos ese pase. Revisa el código.");
      lock.current = false;
    }
  }
  async function start() {
    deniedRef.current = false;
    setDenied(false);
    setError("");
    lock.current = false;
    try {
      setCamera(true);
      const reader = new BrowserQRCodeReader();
      const nextControls = await reader.decodeFromVideoDevice(
        undefined,
        video.current,
        (result) => {
          if (result) lookup(result.getText(), "camera");
        },
      );
      if (!mounted.current) {
        nextControls.stop();
        return;
      }
      controls.current = nextControls;
    } catch {
      if (!mounted.current) return;
      deniedRef.current = true;
      setDenied(true);
      setCamera(false);
    }
  }
  async function deliver(amount) {
    if (delivering || lock.current === false) return;
    setDelivering(true);
    try {
      await api.post("/api/admin/retiros/", {
        codigo: person.codigo,
        cantidad: amount,
      });
      setFlash({ bad: false, text: `Entrega de ${amount} confirmada` });
    } catch (requestError) {
      const text = requestError.response
        ? requestError.response.data?.detail
        : "No pudimos registrar la entrega. Revisa la conexión e intenta de nuevo.";
      setFlash({
        bad: true,
        text:
          text ||
          "No pudimos registrar la entrega. Revisa la conexión e intenta de nuevo.",
      });
    } finally {
      flashTimer.current = setTimeout(() => {
        if (!mounted.current) return;
        setFlash(null);
        setPerson(null);
        setDelivering(false);
        lock.current = false;
        if (lookupSource.current === "camera" && !deniedRef.current) start();
      }, 3000);
    }
  }
  return (
    <main className="scanner">
      <h1>Escáner de pases</h1>
      {!camera && !person && <button onClick={start}>Activar cámara</button>}
      <video ref={video} playsInline muted autoPlay hidden={!camera} />
      {denied && (
        <div className="notice">
          <h2>Cámara bloqueada</h2>
          <p>
            Habilita el permiso de cámara en la configuración del navegador y
            vuelve a intentarlo. Mientras tanto, usa el código manual.
          </p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          lookup(code, "manual");
        }}
      >
        <div className="field">
          <label htmlFor="manual">Código manual</label>
          <input
            id="manual"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Escribe el código del pase"
          />
        </div>
        <button>Buscar pase</button>
      </form>
      {person && (
        <section className="scan-result">
          <h2>
            {person.nombre} {person.apellido}
          </h2>
          <p
            className={`balance ${person.completos_disponibles === 0 ? "none" : ""}`}
          >
            {person.completos_disponibles} disponibles
          </p>
          <div className="actions">
            <button
              disabled={delivering || person.completos_disponibles < 1}
              onClick={() => deliver(1)}
            >
              Entregar 1
            </button>
            <button
              disabled={delivering || person.completos_disponibles < 2}
              onClick={() => deliver(2)}
            >
              Entregar 2
            </button>
          </div>
        </section>
      )}
      {flash && (
        <div className={`overlay ${flash.bad ? "bad" : ""}`} role="status">
          <h2>{flash.text}</h2>
        </div>
      )}
    </main>
  );
}

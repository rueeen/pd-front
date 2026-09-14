import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api";
export default function Pase() {
  const { codigo } = useParams(),
    loc = useLocation(),
    [p, setP] = useState(),
    [bad, setBad] = useState(false),
    [copied, setCopied] = useState(false),
    ref = useRef();
  useEffect(() => {
    api
      .get(`/api/pase/${codigo}/`)
      .then((r) => setP(r.data))
      .catch((requestError) => {
        console.error("No pudimos cargar el pase.", requestError);
        setBad(true);
      });
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
        <p>Cargando pase…</p>
      </main>
    );
  const n = p.completos_disponibles;
  return (
    <main>
      <article className="pass">
        {loc.state?.recuperado && (
          <p className="notice">
            <strong>Registro listo.</strong> Recuperamos tu registro anterior.
          </p>
        )}
        <h1>
          {p.nombre} {p.apellido}
        </h1>
        {p.carrera_nombre && <p className="person-career">{p.carrera_nombre}</p>}
        <div className="qr" ref={ref}>
          <QRCodeCanvas value={url} size={260} level="M" marginSize={1} />
        </div>
        <p className="pass-code">{codigo}</p>
        <p className={`balance ${n === 1 ? "one" : n === 0 ? "none" : ""}`}>
          {n === 2
            ? "2 completos disponibles"
            : n === 1
              ? "1 completo disponible"
              : "Ya retiraste tus 2 completos"}
        </p>
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
          <section>
            <h2>Tus torneos</h2>
            <ul>
              {p.torneos.map((t, i) => (
                <li key={t.slug || i}>{t.nombre || t}</li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}

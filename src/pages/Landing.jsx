import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import CuentaRegresiva from "../components/CuentaRegresiva";
import Programa from "../components/Programa";
import TorneoCard from "../components/TorneoCard";
import banner from "../img/banner-dia-programador-2026.svg?no-inline";
const glyph = [
  "111011101110",
  "001010001000",
  "111011101110",
  "100000101010",
  "111011101110",
];
const active = new Set();
glyph.forEach((row, y) =>
  [...row].forEach((v, x) => {
    if (v === "1") active.add((y + 5) * 16 + x + 2);
  }),
);
export default function Landing() {
  const [t, setT] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/api/torneos/")
      .then((r) => {
        if (!Array.isArray(r.data)) {
          throw new TypeError("La respuesta de torneos no es una lista.");
        }
        setT(r.data);
      })
      .catch((requestError) => {
        console.error("No pudimos cargar los torneos de la portada.", requestError);
        setT([]);
        setError("No pudimos cargar los torneos en este momento.");
      });
  }, []);
  return (
    <>
      <section className="hero section">
        <div
          className="pixel-grid"
          role="img"
          aria-label="Número 256 construido con una cuadrícula de 256 celdas"
        >
          {Array.from({ length: 256 }, (_, i) => (
            <i
              key={i}
              style={{ "--i": i }}
              className={`pixel ${active.has(i) ? "on" : ""}`}
            />
          ))}
        </div>
        <h1>Día del Programador 2026</h1>
        <p className="lead">
          Sábado 3 de octubre, de 11:00 a 16:00
          <br />
          Patio central de INACAP Sede Arica
        </p>
        <Link className="button" to="/registro">
          Registrarme al evento
        </Link>
      </section>
      <img
        className="event-banner"
        src={banner}
        alt="Día del Programador 2026: sábado 3 de octubre, de 11:00 a 16:00, en el patio central de INACAP Sede Arica"
        loading="lazy"
        decoding="async"
      />
      <CuentaRegresiva />
      <section className="section alt">
        <h2>¿Qué celebramos?</h2>
        <p>
          Conmemoramos el día 256 del año. En 2026, la fecha original cae el
          domingo 13 de septiembre, por eso nos reunimos el sábado 3 de octubre.
        </p>
        <p>
          Convocamos a Informática, Ciberseguridad y Telecomunicaciones; Diseño
          e Industria Digital; y Automatización, Electrónica y Robótica.
        </p>
      </section>
      <section className="section">
        <h2>Los tres torneos</h2>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {t.length ? (
          <div className="cards">
            {t.map((x) => (
              <TorneoCard key={x.slug} t={x} />
            ))}
          </div>
        ) : (
          <p>Pronto publicaremos los cupos de cada torneo.</p>
        )}
      </section>
      <Programa />
      <section className="section">
        <h2>Alimentación</h2>
        <p>
          El registro es gratuito. Cada persona registrada puede retirar{" "}
          <strong>2 completos</strong> mostrando su QR. Si quieres colaborar,
          puedes llevar bebida, snack, galletas o desechables. Es completamente
          opcional.
        </p>
      </section>
      <section className="section alt">
        <h2>Nos vemos en el patio central</h2>
        <p>INACAP Sede Arica, sábado 3 de octubre de 2026.</p>
        <Link className="button" to="/registro">
          Registrarme al evento
        </Link>
      </section>
    </>
  );
}

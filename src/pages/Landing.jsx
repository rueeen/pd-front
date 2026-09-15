import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErrorMessage } from "../api";
import CuentaRegresiva from "../components/CuentaRegresiva";
import Programa from "../components/Programa";
import TorneoCard from "../components/TorneoCard";

const glyph = [
  "111011101110",
  "001010001000",
  "111011101110",
  "100000101010",
  "111011101110",
];
const active = new Set();
glyph.forEach((row, y) =>
  [...row].forEach(
    (value, x) => value === "1" && active.add((y + 5) * 16 + x + 2),
  ),
);

const faqs = [
  [
    "¿Quién puede participar?",
    "La comunidad de INACAP Sede Arica y las personas invitadas pueden registrarse gratis y participar durante la jornada.",
  ],
  [
    "¿Puedo competir en más de un torneo?",
    "Sí, siempre que los horarios no se superpongan. Revisa cada bloque antes de inscribirte.",
  ],
  [
    "¿Qué pasa si se acaban los cupos?",
    "Tu inscripción quedará en lista de espera y podrá confirmarse si se libera un lugar.",
  ],
  [
    "¿Qué tengo que llevar?",
    "Lleva tu pase QR y, si compites, lo necesario para acceder a tu cuenta de juego. El aporte de alimentos es opcional.",
  ],
  [
    "¿Hasta cuándo puedo inscribirme?",
    "Puedes registrarte mientras el formulario esté disponible. Cada torneo cierra sus inscripciones al completar sus cupos o antes del sorteo.",
  ],
];

function RevealSections() {
  useEffect(() => {
    const elements = [...document.querySelectorAll(".reveal")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
            if (
              !elements.some(
                (element) => !element.classList.contains("visible"),
              )
            )
              observer.disconnect();
          }
        });
      },
      { threshold: 0.08 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}

export default function Landing() {
  const [tournaments, setTournaments] = useState([]);
  const [configuration, setConfiguration] = useState();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/api/configuracion/")
      .then(({ data }) => setConfiguration(data))
      .catch((requestError) =>
        console.error("No pudimos cargar la disponibilidad.", requestError),
      );
    api
      .get("/api/torneos/")
      .then((response) => {
        if (!Array.isArray(response.data))
          throw new TypeError("La respuesta de torneos no es una lista.");
        setTournaments(response.data);
      })
      .catch((requestError) => {
        console.error(
          "No pudimos cargar los torneos de la portada.",
          requestError,
        );
        setTournaments([]);
        setError(
          apiErrorMessage(
            requestError,
            "No pudimos cargar los torneos en este momento.",
          ),
        );
      });
  }, []);
  const soldOut =
    configuration &&
    (!configuration.registro_abierto || configuration.cupos_disponibles <= 0);
  const lowAvailability =
    configuration &&
    configuration.cupos_disponibles > 0 &&
    configuration.cupos_disponibles < configuration.cupo_asistentes * 0.2;
  return (
    <div className="landing">
      <RevealSections />
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
        <div className="hero-copy">
          <p className="eyebrow hero-item">INACAP · Sede Arica</p>
          <h1 className="hero-item">
            Día del
            <br />
            Programador 2026
          </h1>
          <p className="lead hero-item">
            Celebramos el día 256: una jornada para encontrarnos, jugar y
            compartir en comunidad.
          </p>
          <div className="actions hero-item">
            {!soldOut && (
              <Link className="button" to="/registro">
                Registrarme al evento
              </Link>
            )}
            <Link className="button secondary" to="/mi-pase">
              Abrir mi pase
            </Link>
            <a className="button secondary" href="#torneos">
              Ver torneos
            </a>
          </div>
          {configuration && !soldOut && (
            <p className={`hero-availability ${lowAvailability ? "low" : ""}`}>
              <strong>{configuration.cupos_disponibles}</strong> cupos disponibles
            </p>
          )}
          {soldOut && (
            <div className="notice availability-closed" role="status">
              <p>{configuration.mensaje_cupos_agotados}</p>
              <Link to="/mi-pase">Ya me inscribí: abrir mi pase</Link>
            </div>
          )}
        </div>
        <aside
          className="event-info hero-item"
          aria-label="Información del evento"
        >
          <p>
            <span aria-hidden="true">▣</span>
            <small>Fecha</small>
            <strong>Sábado 3 de octubre</strong>
          </p>
          <p>
            <span aria-hidden="true">◷</span>
            <small>Horario</small>
            <strong>10:00 a 16:00</strong>
          </p>
          <p>
            <span aria-hidden="true">⌖</span>
            <small>Lugar</small>
            <strong>
              Patio central, INACAP Sede Arica
              <span className="event-address">Avenida Santa María 2190</span>
            </strong>
          </p>
        </aside>
      </section>
      <div className="reveal">
        <CuentaRegresiva />
      </div>
      <section className="section reveal" id="torneos">
        <p className="eyebrow">Competencias</p>
        <h2>Los tres torneos</h2>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {tournaments.length ? (
          <div className="cards">
            {tournaments.map((tournament) => (
              <TorneoCard key={tournament.slug} t={tournament} />
            ))}
          </div>
        ) : (
          !error && <p>Pronto publicaremos los cupos de cada torneo.</p>
        )}
      </section>
      <section className="free-play reveal">
        <div>
          <p className="eyebrow light">También puedes venir a jugar</p>
          <h2>Juego libre durante la jornada</h2>
        </div>
        <p>
          Fuera de los bloques de competencia, las estaciones y consolas quedan
          abiertas al público en turnos. También habrá juegos de mesa durante
          toda la jornada.
        </p>
      </section>
      <Programa />
      <section className="section reveal food">
        <p className="eyebrow">Alimentación</p>
        <h2>Recarga energías</h2>
        <p>
          INACAP aporta la base de la alimentación, y cada persona registrada
          retira sus completos presentando el QR de su pase. Quien quiera puede
          llevar un aporte colaborativo —bebidas, snacks, galletas o
          desechables— para que alcance para más. Es opcional y no condiciona
          nada.
        </p>
      </section>
      <section className="section alt reveal" id="preguntas">
        <p className="eyebrow">Antes de venir</p>
        <h2>Preguntas frecuentes</h2>
        <div className="faq">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <div>
                <p>{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-columns">
          <section>
            <h2>El evento</h2>
            <p>
              Día del Programador 2026. Sábado 3 de octubre, de 10:00 a 16:00.
              Patio central de la sede.
            </p>
          </section>
          <section>
            <h2>La sede</h2>
            <p>INACAP Sede Arica. Avenida Santa María 2190, Arica.</p>
            <a
              href="https://portal.inacap.cl"
              target="_blank"
              rel="noreferrer"
            >
              Portal INACAP
            </a>
          </section>
          <section>
            <h2>Organiza</h2>
            <p>
              Área de Informática, Ciberseguridad y Telecomunicaciones. Jornada
              realizada con la colaboración de Diseño e Industria Digital y de
              Automatización, Electrónica y Robótica, las otras dos áreas
              convocadas.
            </p>
          </section>
        </div>
        <p className="footer-copyright">
          © 2026 Ruben Valencia —{" "}
          <a href="mailto:rvalencia@inacap.cl">rvalencia@inacap.cl</a>
        </p>
      </footer>
    </div>
  );
}

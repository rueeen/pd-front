import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import CuentaRegresiva from "../components/CuentaRegresiva";
import Programa from "../components/Programa";
import TorneoCard from "../components/TorneoCard";
import bannerProgramador from "../img/banner-dia-programador-2026.svg";

const glyph = ["111011101110", "001010001000", "111011101110", "100000101010", "111011101110"];
const active = new Set();
glyph.forEach((row, y) => [...row].forEach((value, x) => value === "1" && active.add((y + 5) * 16 + x + 2)));

const faqs = [
  ["¿Quién puede participar?", "La comunidad de INACAP Sede Arica y las personas invitadas pueden registrarse gratis y participar durante la jornada."],
  ["¿Puedo competir en más de un torneo?", "Sí, siempre que los horarios no se superpongan. Revisa cada bloque antes de inscribirte."],
  ["¿Qué pasa si se acaban los cupos?", "Tu inscripción quedará en lista de espera y podrá confirmarse si se libera un lugar."],
  ["¿Qué tengo que llevar?", "Lleva tu pase QR y, si compites, lo necesario para acceder a tu cuenta de juego. El aporte de alimentos es opcional."],
  ["¿Hasta cuándo puedo inscribirme?", "Puedes registrarte mientras el formulario esté disponible. Cada torneo cierra sus inscripciones al completar sus cupos o antes del sorteo."],
];

function RevealSections() {
  useEffect(() => {
    const elements = [...document.querySelectorAll(".reveal")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
          if (!elements.some((element) => !element.classList.contains("visible"))) observer.disconnect();
        }
      });
    }, { threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}

export default function Landing() {
  const [tournaments, setTournaments] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/api/torneos/").then((response) => {
      if (!Array.isArray(response.data)) throw new TypeError("La respuesta de torneos no es una lista.");
      setTournaments(response.data);
    }).catch((requestError) => {
      console.error("No pudimos cargar los torneos de la portada.", requestError);
      setTournaments([]);
      setError("No pudimos cargar los torneos en este momento.");
    });
  }, []);
  return (
    <div className="landing">
      <RevealSections />
      <section className="hero section">
        <div className="pixel-grid" role="img" aria-label="Número 256 construido con una cuadrícula de 256 celdas">
          {Array.from({ length: 256 }, (_, i) => <i key={i} style={{ "--i": i }} className={`pixel ${active.has(i) ? "on" : ""}`} />)}
        </div>
        <div className="hero-copy">
          <p className="eyebrow hero-item">Sede Arica</p>
          <h1 className="hero-item">Día del<br />Programador 2026</h1>
          <p className="lead hero-item">Celebramos el día 256: una jornada para encontrarnos, jugar y compartir en comunidad.</p>
          <div className="actions hero-item">
            <Link className="button" to="/registro">Registrarme al evento</Link>
            <a className="button secondary" href="#torneos">Ver torneos</a>
          </div>
        </div>
        <aside className="event-info hero-item" aria-label="Información del evento">
          <p><span aria-hidden="true">▣</span><small>Fecha</small><strong>Sábado 3 de octubre</strong></p>
          <p><span aria-hidden="true">◷</span><small>Horario</small><strong>11:00 a 16:00</strong></p>
          <p><span aria-hidden="true">⌖</span><small>Lugar</small><strong>Patio central</strong></p>
        </aside>
      </section>
      <section className="event-banner section reveal" aria-label="Imagen destacada del evento">
        <img src={bannerProgramador} alt="Banner del Día del Programador 2026 de INACAP Sede Arica" />
      </section>
      <div className="reveal"><CuentaRegresiva /></div>
      <section className="section reveal" id="torneos">
        <p className="eyebrow">Competencias</p><h2>Los tres torneos</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {tournaments.length ? <div className="cards">{tournaments.map((tournament) => <TorneoCard key={tournament.slug} t={tournament} />)}</div> : !error && <p>Pronto publicaremos los cupos de cada torneo.</p>}
      </section>
      <section className="free-play reveal">
        <div><p className="eyebrow light">También puedes venir a jugar</p><h2>Juego libre durante la jornada</h2></div>
        <p>Fuera de los bloques de competencia, las estaciones y consolas quedan abiertas al público en turnos. También habrá juegos de mesa durante toda la jornada.</p>
      </section>
      <Programa />
      <section className="section reveal food">
        <p className="eyebrow">Alimentación</p><h2>Recarga energías</h2>
        <p>El registro es gratuito. Cada persona recibe <strong>dos completos</strong> presentando su QR. Si quieres, puedes hacer un aporte colaborativo; es completamente opcional.</p>
      </section>
      <section className="section alt reveal" id="preguntas">
        <p className="eyebrow">Antes de venir</p><h2>Preguntas frecuentes</h2>
        <div className="faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><div><p>{answer}</p></div></details>)}</div>
      </section>
      <footer><strong>Día del Programador 2026</strong><span>INACAP Sede Arica · Sábado 3 de octubre</span></footer>
    </div>
  );
}

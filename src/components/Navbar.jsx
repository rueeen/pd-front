import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link className="brand" to="/">
        Día del Programador <span>2026</span>
      </Link>
      <nav aria-label="Principal">
        <Link to="/torneos">Torneos</Link>
        <Link to="/mi-pase">Mi pase</Link>
        <a href="/#programa">Programa</a>
        <a href="/#preguntas">Preguntas frecuentes</a>
        <Link className="button secondary small" to="/registro">
          Registrarme
        </Link>
      </nav>
    </header>
  );
}

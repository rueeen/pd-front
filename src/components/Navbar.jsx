import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const header = useRef(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    const onPointerDown = (event) => !header.current?.contains(event.target) && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <header ref={header} className={`nav ${scrolled ? "scrolled" : ""} ${open ? "menu-open" : ""}`}>
      <Link className="brand" to="/" onClick={close}>Día del Programador <span>2026</span></Link>
      <button className="nav-toggle secondary" type="button" aria-expanded={open} aria-controls="main-navigation" aria-label={open ? "Cerrar menú principal" : "Abrir menú principal"} onClick={() => setOpen((current) => !current)}><span aria-hidden="true" /></button>
      <nav id="main-navigation" aria-label="Principal">
        <Link to="/torneos" onClick={close}>Torneos</Link>
        <Link to="/mi-pase" onClick={close}>Mi pase</Link>
        <a href="/#programa" onClick={close}>Programa</a>
        <a href="/#preguntas" onClick={close}>Preguntas frecuentes</a>
        <Link className="button secondary small" to="/registro" onClick={close}>Registrarme</Link>
      </nav>
    </header>
  );
}

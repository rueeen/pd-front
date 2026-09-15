import { useEffect, useState } from "react";
const target = new Date("2026-10-03T10:30:00-03:00");
function left() {
  const d = target - Date.now();
  return d <= 0
    ? null
    : {
        d: Math.floor(d / 864e5),
        h: Math.floor(d / 36e5) % 24,
        m: Math.floor(d / 6e4) % 60,
        s: Math.floor(d / 1e3) % 60,
      };
}
export default function CuentaRegresiva() {
  const [t, setT] = useState(left);
  useEffect(() => {
    const id = setInterval(() => setT(left()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="section countdown">
      <h2>Falta poco</h2>
      {t ? (
        <div className="digits">
          {[
            ["días", t.d],
            ["horas", t.h],
            ["minutos", t.m],
            ["segundos", t.s],
          ].map(([l, v]) => (
            <span key={l}>
              <b className={l === "segundos" ? "tick" : ""} key={l === "segundos" ? v : l}>{v}</b>
              {l}
            </span>
          ))}
        </div>
      ) : (
        <p className="lead">El evento ya se realizó</p>
      )}
    </section>
  );
}

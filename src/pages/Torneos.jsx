import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../api";
import TorneoCard from "../components/TorneoCard";
export default function Torneos() {
  const [t, setT] = useState([]),
    [e, setE] = useState("");
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
        console.error("No pudimos cargar los torneos.", requestError);
        setT([]);
        setE(apiErrorMessage(requestError, "No pudimos cargar los torneos."));
      });
  }, []);
  return (
    <main>
      <p className="eyebrow">Competencias</p><h1>Torneos</h1>
      <p className="lead">
        Compite en Mario Kart, Smash, VALORANT o League of Legends.
      </p>
      {e && <p className="error">{e}</p>}
      <div className="cards">
        {t.map((x) => (
          <TorneoCard t={x} key={x.slug} />
        ))}
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { RATE_LIMIT_EVENT } from "../api";

export default function AvisoLimitePeticiones() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const showMessage = (event) => setMessage(event.detail);
    window.addEventListener(RATE_LIMIT_EVENT, showMessage);
    return () => window.removeEventListener(RATE_LIMIT_EVENT, showMessage);
  }, []);

  if (!message) return null;

  return (
    <div className="rate-limit-alert" role="alert">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setMessage("")}
        aria-label="Cerrar aviso"
      >
        Cerrar
      </button>
    </div>
  );
}

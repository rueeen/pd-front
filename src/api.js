import axios from "axios";

export const RATE_LIMIT_MESSAGE =
  "Hubo demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
export const RATE_LIMIT_EVENT = "api:rate-limit";
export const apiErrorMessage = (error, fallback) =>
  error.userMessage || error.response?.data?.detail || fallback;

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!configuredApiUrl) {
  console.error(
    "Falta el archivo .env o VITE_API_URL está vacío. Copia .env.example como .env y reinicia Vite.",
  );
}

const api = axios.create({
  baseURL: configuredApiUrl || "http://localhost:8000",
});
api.interceptors.request.use((c) => {
  const token = localStorage.getItem("access");
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});
api.interceptors.response.use(
  (response) => {
    const requestPath = response.config.url || "";
    const contentType = response.headers["content-type"] || "";
    const expectsBlob = response.config.responseType === "blob";

    if (
      requestPath.startsWith("/api/") &&
      !expectsBlob &&
      !contentType.toLowerCase().includes("application/json")
    ) {
      const error = new axios.AxiosError(
        `La API respondió con un tipo de contenido inesperado: ${contentType || "sin content-type"}`,
        axios.AxiosError.ERR_NETWORK,
        response.config,
        response.request,
        response,
      );
      console.error(
        "La petición no llegó al backend: se esperaba una respuesta JSON.",
        error,
      );
      return Promise.reject(error);
    }

    return response;
  },
  (e) => {
    if (e.response?.status === 429) {
      e.userMessage = RATE_LIMIT_MESSAGE;
      e.response.data = {
        ...(typeof e.response.data === "object" && e.response.data !== null
          ? e.response.data
          : {}),
        detail: RATE_LIMIT_MESSAGE,
      };
      window.dispatchEvent(
        new CustomEvent(RATE_LIMIT_EVENT, { detail: RATE_LIMIT_MESSAGE }),
      );
    }
    if (e.response?.status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      if (!location.pathname.startsWith("/admin/login"))
        location.assign("/admin/login");
    }
    return Promise.reject(e);
  },
);
export default api;

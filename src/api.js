import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((c) => {
  const token = localStorage.getItem("access");
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
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

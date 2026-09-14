import { Navigate, Outlet, useLocation } from "react-router-dom";
export default function RutaProtegida() {
  const l = useLocation();
  return localStorage.getItem("access") ? (
    <Outlet />
  ) : (
    <Navigate to="/admin/login" state={{ from: l }} replace />
  );
}

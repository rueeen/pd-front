import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LimiteDeError from "./components/LimiteDeError";
import RutaProtegida from "./components/RutaProtegida";
import Landing from "./pages/Landing";
import Registro from "./pages/Registro";
import Pase from "./pages/Pase";
import Torneos from "./pages/Torneos";
import InscripcionTorneo from "./pages/InscripcionTorneo";
import Bracket from "./pages/Bracket";
import Login from "./pages/Login";
import MiPase from "./pages/MiPase";

const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminEscaner = lazy(() => import("./pages/AdminEscaner"));
const AdminTorneo = lazy(() => import("./pages/AdminTorneo"));

export default function App() {
  return (
    <>
      <Navbar />
      <LimiteDeError>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/mi-pase" element={<MiPase />} />
          <Route path="/pase/:codigo" element={<Pase />} />
          <Route path="/torneos" element={<Torneos />} />
          <Route
            path="/torneos/:slug/inscripcion"
            element={<InscripcionTorneo />}
          />
          <Route path="/torneos/:slug/llave" element={<Bracket />} />
          <Route path="/admin/login" element={<Login />} />
          <Route element={<RutaProtegida />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<p>Cargando administración…</p>}>
                  <AdminPanel />
                </Suspense>
              }
            />
            <Route
              path="/admin/escaner"
              element={
                <Suspense fallback={<p>Cargando administración…</p>}>
                  <AdminEscaner />
                </Suspense>
              }
            />
            <Route
              path="/admin/torneos/:slug"
              element={
                <Suspense fallback={<p>Cargando administración…</p>}>
                  <AdminTorneo />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="*"
            element={
              <main>
                <h1>Página no encontrada</h1>
              </main>
            }
          />
        </Routes>
      </LimiteDeError>
    </>
  );
}

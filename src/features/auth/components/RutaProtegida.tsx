import { Navigate, Outlet, useLocation } from "react-router";
import { PARAMETRO_SIGUIENTE } from "@/routes/rutas";
import { CargandoApp } from "@/components/shared/CargandoApp";
import { useSesion } from "../useSesion";

/** Sin sesión, cualquier ruta hija va a /login recordando a dónde se quería ir. */
export function RutaProtegida() {
  const { cargando, sesion } = useSesion();
  const { pathname, search, hash } = useLocation();

  if (cargando) return <CargandoApp />;
  if (!sesion) {
    const siguiente = new URLSearchParams({ [PARAMETRO_SIGUIENTE]: pathname + search + hash });
    return <Navigate to={`/login?${siguiente}`} replace />;
  }
  return <Outlet />;
}

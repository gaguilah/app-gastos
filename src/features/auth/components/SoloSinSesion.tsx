import { Navigate, Outlet, useSearchParams } from "react-router";
import { PARAMETRO_SIGUIENTE } from "@/routes/rutas";
import { CargandoApp } from "@/components/shared/CargandoApp";
import { destinoTrasLogin } from "../rutas";
import { useSesion } from "../useSesion";

/** Login y recuperar: con sesión abierta no tienen sentido, así que se sigue a la ruta pedida. */
export function SoloSinSesion() {
  const { cargando, sesion, recuperando } = useSesion();
  const [parametros] = useSearchParams();

  if (cargando) return <CargandoApp />;
  if (sesion && !recuperando) {
    return <Navigate to={destinoTrasLogin(parametros.get(PARAMETRO_SIGUIENTE))} replace />;
  }
  return <Outlet />;
}

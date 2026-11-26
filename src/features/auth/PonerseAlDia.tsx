import { usePonerseAlDia } from "@/datos/ponerseAlDia";
import { diaBogota } from "@/dominio/fechas";
import { useSesion } from "./useSesion";

/** Sin interfaz: pone al día los datos del usuario al abrir la app (ver usePonerseAlDia). */
export function PonerseAlDia() {
  const { sesion } = useSesion();
  usePonerseAlDia(Boolean(sesion), diaBogota(new Date()));
  return null;
}

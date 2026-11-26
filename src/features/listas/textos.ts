import type { TFunction } from "i18next";
import { fechaCorta } from "@/dominio/fechas";
import type { Elemento, Lista } from "@/datos/listas";

/** Los canales se distinguen en el nombre: «Bre-B (canal)» (criterio de la spec #10). */
export const nombreVisible = (e: Elemento, t: TFunction) =>
  e.subtipo === "canal" ? t("listas.canal", { nombre: e.nombre }) : e.nombre;

export function ultimoUso(e: Elemento, hoy: string, t: TFunction, idioma: string) {
  if (!e.ultimo) return null;
  const fecha = fechaCorta(e.ultimo, hoy, idioma);
  return "clave" in fecha ? t(fecha.clave) : fecha.texto;
}

/** «22 gastos · último: Hoy», o «Sin uso». */
export function resumenUso(e: Elemento, lista: Lista, hoy: string, t: TFunction, idioma: string) {
  if (e.usos === 0) return t("listas.sinUso");
  const ultimo = ultimoUso(e, hoy, t, idioma);
  const usos = t(`listas.usos.${lista}`, { count: e.usos });
  return ultimo ? `${usos} · ${t("listas.ultimo", { fecha: ultimo })}` : usos;
}

/** Solo se unen registros del mismo tipo o clase (supuesto 6). */
export const candidatosUnir = (e: Elemento, todos: Elemento[]) =>
  todos.filter((o) => o.id !== e.id && o.subtipo === e.subtipo);

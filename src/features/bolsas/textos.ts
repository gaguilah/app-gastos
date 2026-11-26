import type { TFunction } from "i18next";
import type { Bolsa, Movimiento } from "@/datos/bolsas";
import { claveErrorDatos, esNombreRepetido } from "@/datos/errores";
import { fechaCorta } from "@/dominio/fechas";

export function fechaVisible(dia: string, hoy: string, t: TFunction, idioma: string) {
  const fecha = fechaCorta(dia, hoy, idioma);
  return "clave" in fecha ? t(fecha.clave) : fecha.texto;
}

/** «Taxi al centro · Hoy», o «Sin movimientos». */
export function ultimoMovimiento(b: Bolsa, hoy: string, t: TFunction, idioma: string) {
  if (!b.ultimo) return t("bolsas.sinMovimientos");
  const titulo = b.ultimoTitulo ?? t(`bolsas.movimiento.tipo.${b.ultimoTipo}`);
  return t("bolsas.ultimo", { titulo, fecha: fechaVisible(b.ultimo, hoy, t, idioma) });
}

/** Título del movimiento: el suyo o el nombre del tipo (recargas y traslados sin nota). */
export const tituloMovimiento = (m: Movimiento, t: TFunction) =>
  m.titulo ?? t(`bolsas.movimiento.tipo.${m.tipo}`);

/** Qué fue: «desde Nequi», «aporte a Viaje», la categoría del ingreso o el lugar del gasto. */
export function detalleMovimiento(m: Movimiento, t: TFunction): string | null {
  const nombre = m.contraparte;
  switch (m.tipo) {
    case "recarga":
    case "ajuste":
    case "saldo_inicial":
      // Sin nota, el título ya es el tipo: no se repite.
      return m.titulo && t(`bolsas.movimiento.detalle.${m.tipo}`);
    case "traslado":
      return (
        nombre && t(`bolsas.movimiento.detalle.${m.valor > 0 ? "desde" : "hacia"}`, { nombre })
      );
    case "aporte":
    case "retiro":
      return nombre && t(`bolsas.movimiento.detalle.${m.tipo}`, { nombre });
    default:
      return nombre;
  }
}

export const esNombreBolsaRepetido = (error: unknown) =>
  esNombreRepetido(error) || claveErrorDatos(error) === "errores.servidor.bolsa_nombre_repetido";

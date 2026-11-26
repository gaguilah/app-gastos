// Fechas en pantalla (DESIGN.md · Dinero y fechas). Sin Date.now(): "hoy" llega de afuera.

const ZONA = "America/Bogota";

/** Día calendario (AAAA-MM-DD) de un instante en Bogotá. */
export const diaBogota = (instante: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(instante);

const comoUtc = (dia: string) => new Date(`${dia}T00:00:00Z`);
const UN_DIA = 86_400_000;

/** «Hoy», «Ayer» (claves de i18n) o «13 nov»; con el año si no es el actual. */
export function fechaCorta(
  dia: string,
  hoy: string,
  idioma: string,
): { clave: "fechas.hoy" | "fechas.ayer" } | { texto: string } {
  const diferencia = (comoUtc(hoy).getTime() - comoUtc(dia).getTime()) / UN_DIA;
  if (diferencia === 0) return { clave: "fechas.hoy" };
  if (diferencia === 1) return { clave: "fechas.ayer" };
  const texto = new Intl.DateTimeFormat(idioma === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "short",
    ...(dia.slice(0, 4) !== hoy.slice(0, 4) && { year: "numeric" }),
    timeZone: "UTC",
  })
    .format(comoUtc(dia))
    .replace(/\./g, "")
    .replace(/ de /g, " ");
  return { texto };
}

const partes = (dia: string, idioma: string) => {
  const fecha = comoUtc(dia);
  const mes = new Intl.DateTimeFormat(idioma === "en" ? "en-US" : "es-CO", {
    month: "short",
    timeZone: "UTC",
  })
    .format(fecha)
    .replace(/\./g, "")
    .slice(0, 3);
  return { dia: fecha.getUTCDate(), mes, anio: fecha.getUTCFullYear() };
};

/** Rango de un período: «1 – 30 nov 2026», «Nov 1 – 30, 2026», «15 dic 2026 – 14 ene 2027». */
export function rangoPeriodo(inicio: string, fin: string, idioma: string) {
  const a = partes(inicio, idioma);
  const b = partes(fin, idioma);
  const mismoAnio = a.anio === b.anio;
  const mismoMes = mismoAnio && a.mes === b.mes;
  if (idioma === "en") {
    const desde = `${a.mes} ${a.dia}${mismoAnio ? "" : `, ${a.anio}`}`;
    return `${desde} – ${mismoMes ? "" : `${b.mes} `}${b.dia}, ${b.anio}`;
  }
  const desde = mismoMes ? `${a.dia}` : `${a.dia} ${a.mes}${mismoAnio ? "" : ` ${a.anio}`}`;
  return `${desde} – ${b.dia} ${b.mes} ${b.anio}`;
}

/** «Lunes, 9 de noviembre de 2026» o «Monday, November 9, 2026» (detalle de un registro). */
export function fechaLarga(dia: string, idioma: string) {
  const texto = new Intl.DateTimeFormat(idioma === "en" ? "en-US" : "es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(comoUtc(dia));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export type UnidadPlazo = "dias" | "semanas" | "meses";

/** Fecha final de una meta a partir de su plazo (supuesto 19); en meses, sin pasar del fin de mes. */
export function fechaPorPlazo(hoy: string, cantidad: number, unidad: UnidadPlazo) {
  const fecha = comoUtc(hoy);
  if (unidad === "meses") {
    const dia = fecha.getUTCDate();
    fecha.setUTCDate(1);
    fecha.setUTCMonth(fecha.getUTCMonth() + cantidad);
    const ultimo = new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0),
    ).getUTCDate();
    fecha.setUTCDate(Math.min(dia, ultimo));
  } else {
    fecha.setUTCDate(fecha.getUTCDate() + cantidad * (unidad === "semanas" ? 7 : 1));
  }
  return fecha.toISOString().slice(0, 10);
}

/** «jun 2027» o «Jun 2027» (proyección de una meta). */
export function mesAnio(dia: string, idioma: string) {
  const { mes, anio } = partes(dia, idioma);
  return `${mes} ${anio}`;
}

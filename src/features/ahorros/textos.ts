import type { TFunction } from "i18next";
import type { Meta, Origen } from "@/datos/ahorros";
import { formatearPesos, porcentajeUsado } from "@/dominio/dinero";

/** «$250.000 / mes», o «Sin aporte periódico». */
export const aporteCorto = (m: Meta, t: TFunction) =>
  m.regla && !m.regla.pausada
    ? t(`ahorros.aportePor.${m.regla.frecuencia}`, { valor: formatearPesos(m.regla.valor) })
    : t("ahorros.sinAporte");

/** Avance en enteros hacia abajo, como el porcentaje del presupuesto. */
export const avanceMeta = (saldo: number, monto: number) => porcentajeUsado(saldo, monto);

export const varianteEstadoMeta = {
  al_dia: "ok",
  atrasada: "pending",
  cumplida: "ok",
  pausada: "neutral",
} as const;

// El origen de un aporte viaja como un solo valor de radio: el id de la bolsa o «medio:<id>».
const PREFIJO_MEDIO = "medio:";
export const valorOrigen = (o: Pick<Origen, "bolsaId" | "medioId">) =>
  o.medioId ? `${PREFIJO_MEDIO}${o.medioId}` : o.bolsaId;
export const leerOrigen = (valor: string | null, afecta: boolean): Origen | null =>
  !valor
    ? null
    : valor.startsWith(PREFIJO_MEDIO)
      ? { bolsaId: null, medioId: valor.slice(PREFIJO_MEDIO.length), afectaPresupuesto: afecta }
      : { bolsaId: valor, medioId: null, afectaPresupuesto: false };

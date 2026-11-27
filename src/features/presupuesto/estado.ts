import { porcentajeUsado } from "@/dominio/dinero";
import type { Periodo } from "@/datos/presupuesto";

export type EstadoPeriodo = "enCurso" | "dentro" | "advertencia" | "superado" | "sinPresupuesto";

/**
 * Insignia de la lista: superado gana a «En curso»; los cerrados según su uso (3.2). Sin
 * ingresos al presupuesto no hay % ni estado de uso (Etapa 6A, decisión 4).
 */
export function estadoPeriodo(periodo: Periodo, enCurso: boolean): EstadoPeriodo {
  if (periodo.presupuesto <= 0) return enCurso ? "enCurso" : "sinPresupuesto";
  const porcentaje = porcentajeUsado(periodo.usado, periodo.presupuesto);
  if (porcentaje > 100) return "superado";
  if (enCurso) return "enCurso";
  return porcentaje >= 70 ? "advertencia" : "dentro";
}

export const varianteEstado = {
  enCurso: "ok",
  dentro: "neutral",
  advertencia: "pending",
  superado: "superado",
  sinPresupuesto: "neutral",
} as const;

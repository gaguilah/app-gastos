import { porcentajeUsado } from "@/dominio/dinero";
import type { Periodo } from "@/datos/presupuesto";

export type EstadoPeriodo = "enCurso" | "dentro" | "advertencia" | "superado";

/** Insignia de la lista: superado gana a «En curso»; los cerrados según su uso (3.2). */
export function estadoPeriodo(periodo: Periodo, enCurso: boolean): EstadoPeriodo {
  const porcentaje = porcentajeUsado(periodo.usado, periodo.base);
  if (porcentaje > 100) return "superado";
  if (enCurso) return "enCurso";
  return porcentaje >= 70 ? "advertencia" : "dentro";
}

export const varianteEstado = {
  enCurso: "ok",
  dentro: "neutral",
  advertencia: "pending",
  superado: "superado",
} as const;

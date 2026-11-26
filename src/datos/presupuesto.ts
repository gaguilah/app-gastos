import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type Periodo = {
  id: string;
  inicio: string;
  fin: string;
  presupuesto: number;
  ingresosPresupuesto: number;
  /** Presupuesto + ingresos al presupuesto: la base de las alertas (3.2). */
  base: number;
  /** base − disponible: gastos y aportes que afectan el presupuesto. */
  usado: number;
  disponible: number;
  cerrado: boolean;
  nota: string | null;
};

export type Presupuesto = {
  perfilId: string;
  diaInicio: number;
  presupuestoDefecto: number;
  /** Del más reciente al más antiguo. */
  periodos: Periodo[];
};

export const clavePresupuesto = ["presupuesto"] as const;

async function leerPresupuesto(): Promise<Presupuesto> {
  const [perfil, disponibles, periodos] = await Promise.all([
    supabase.from("perfiles").select("id, dia_inicio, presupuesto_defecto").single(),
    supabase
      .from("disponible_periodo")
      .select("periodo_id, fecha_inicio, fecha_fin, presupuesto, ingresos_presupuesto, disponible"),
    supabase.from("periodos").select("id, cerrado_at, nota_presupuesto"),
  ]);
  for (const r of [perfil, disponibles, periodos]) if (r.error) throw r.error;
  const extra = new Map(periodos.data!.map((p) => [p.id, p]));
  return {
    perfilId: perfil.data!.id,
    diaInicio: perfil.data!.dia_inicio,
    presupuestoDefecto: perfil.data!.presupuesto_defecto,
    periodos: disponibles
      .data!.map((d) => {
        const presupuesto = d.presupuesto ?? 0;
        const ingresosPresupuesto = d.ingresos_presupuesto ?? 0;
        const base = presupuesto + ingresosPresupuesto;
        const disponible = d.disponible ?? 0;
        const p = extra.get(d.periodo_id!);
        return {
          id: d.periodo_id!,
          inicio: d.fecha_inicio!,
          fin: d.fecha_fin!,
          presupuesto,
          ingresosPresupuesto,
          base,
          usado: base - disponible,
          disponible,
          cerrado: Boolean(p?.cerrado_at),
          nota: p?.nota_presupuesto ?? null,
        };
      })
      .sort((a, b) => b.inicio.localeCompare(a.inicio)),
  };
}

export function usePresupuesto() {
  return useQuery({ queryKey: clavePresupuesto, queryFn: leerPresupuesto });
}

/** El período que contiene hoy y sigue abierto: el único que se ajusta (supuesto 10). */
export const periodoEnCurso = (periodos: Periodo[], hoy: string) =>
  periodos.find((p) => !p.cerrado && p.inicio <= hoy && hoy <= p.fin);

export type PeriodoPrevisto = { orden: number; inicio: string; fin: string };

/** Actual, siguiente y después con el día de inicio propuesto (vista_previa_periodos). */
export function useVistaPreviaPeriodos(dia: number | null) {
  return useQuery({
    queryKey: [...clavePresupuesto, "vistaPrevia", dia],
    enabled: dia !== null && dia >= 1 && dia <= 31,
    queryFn: async (): Promise<PeriodoPrevisto[]> => {
      const { data, error } = await supabase.rpc("vista_previa_periodos", { p_dia: dia! });
      if (error) throw error;
      return data.map((f) => ({ orden: f.orden, inicio: f.fecha_inicio, fin: f.fecha_fin }));
    },
  });
}

function useMutacionPresupuesto<T>(accion: (datos: T) => Promise<void>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSettled: () => cliente.invalidateQueries({ queryKey: clavePresupuesto }),
  });
}

export function useCambiarDiaInicio() {
  return useMutacionPresupuesto(async ({ perfilId, dia }: { perfilId: string; dia: number }) => {
    const { error } = await supabase
      .from("perfiles")
      .update({ dia_inicio: dia })
      .eq("id", perfilId);
    if (error) throw error;
  });
}

export function useCambiarPresupuestoDefecto() {
  return useMutacionPresupuesto(async ({ valor, actual }: { valor: number; actual: boolean }) => {
    const { error } = await supabase.rpc("cambiar_presupuesto_defecto", {
      p_valor: valor,
      p_actual: actual,
    });
    if (error) throw error;
  });
}

export function useAjustarPeriodo() {
  return useMutacionPresupuesto(
    async ({ periodoId, ajuste, nota }: { periodoId: string; ajuste: number; nota: string }) => {
      const { error } = await supabase.rpc("ajustar_presupuesto_periodo", {
        p_periodo_id: periodoId,
        p_ajuste: ajuste,
        p_nota: nota,
      });
      if (error) throw error;
    },
  );
}

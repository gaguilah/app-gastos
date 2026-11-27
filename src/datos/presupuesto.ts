import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type Periodo = {
  id: string;
  inicio: string;
  fin: string;
  /** Salario del período y la parte que va al presupuesto (Etapa 6A, decisión 1). */
  salario: number;
  salarioPresupuesto: number;
  /** Ingresos con «Suma al presupuesto». */
  ingresosPresupuesto: number;
  /** Parte del salario + ingresos que suman: la base de las alertas (3.2). */
  presupuesto: number;
  /** presupuesto − disponible: gastos y aportes que afectan el presupuesto. */
  usado: number;
  disponible: number;
  cerrado: boolean;
  /** Última vez que se volvió a cerrar, si alguna. */
  recerradoAt: string | null;
};

export type Presupuesto = {
  perfilId: string;
  diaInicio: number;
  /** Salario base con que abre cada período (decisión 2). */
  salarioBase: number;
  presupuestoSalarioBase: number;
  categoriaSalarioId: string | null;
  /** Del más reciente al más antiguo. */
  periodos: Periodo[];
};

export const clavePresupuesto = ["presupuesto"] as const;

async function leerPresupuesto(): Promise<Presupuesto> {
  const [perfil, disponibles, periodos] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, dia_inicio, salario_base, presupuesto_salario_base, categoria_salario_id")
      .single(),
    supabase
      .from("disponible_periodo")
      .select(
        "periodo_id, fecha_inicio, fecha_fin, presupuesto, ingresos_presupuesto, disponible, salario, salario_presupuesto",
      ),
    supabase.from("periodos").select("id, cerrado_at, recerrado_at"),
  ]);
  for (const r of [perfil, disponibles, periodos]) if (r.error) throw r.error;
  const extra = new Map(periodos.data!.map((p) => [p.id, p]));
  return {
    perfilId: perfil.data!.id,
    diaInicio: perfil.data!.dia_inicio,
    salarioBase: perfil.data!.salario_base,
    presupuestoSalarioBase: perfil.data!.presupuesto_salario_base,
    categoriaSalarioId: perfil.data!.categoria_salario_id,
    periodos: disponibles
      .data!.map((d) => {
        const presupuesto = d.presupuesto ?? 0;
        const disponible = d.disponible ?? 0;
        const p = extra.get(d.periodo_id!);
        return {
          id: d.periodo_id!,
          inicio: d.fecha_inicio!,
          fin: d.fecha_fin!,
          salario: d.salario ?? 0,
          salarioPresupuesto: d.salario_presupuesto ?? 0,
          ingresosPresupuesto: d.ingresos_presupuesto ?? 0,
          presupuesto,
          usado: presupuesto - disponible,
          disponible,
          cerrado: Boolean(p?.cerrado_at),
          recerradoAt: p?.recerrado_at ?? null,
        };
      })
      .sort((a, b) => b.inicio.localeCompare(a.inicio)),
  };
}

export function usePresupuesto() {
  return useQuery({ queryKey: clavePresupuesto, queryFn: leerPresupuesto });
}

/** El período que contiene hoy y sigue abierto. */
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

export type DatosSalario = {
  salario: number;
  presupuesto: number;
  categoriaId: string | null;
  /** También el salario del período en curso (lo crea o lo actualiza). */
  actual: boolean;
};

/** Salario base con que abre cada período (decisión 2, S1). */
export function useConfigurarSalario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async ({ salario, presupuesto, categoriaId, actual }: DatosSalario) => {
      const { error } = await supabase.rpc("configurar_salario", {
        p_salario: salario,
        p_presupuesto: presupuesto,
        p_categoria_id: categoriaId ?? undefined,
        p_actual: actual,
      });
      if (error) throw error;
    },
    // El salario del período es un ingreso: cambia ingresos y presupuesto.
    onSettled: () =>
      Promise.all(
        [clavePresupuesto, ["ingresos"]].map((queryKey) => cliente.invalidateQueries({ queryKey })),
      ),
  });
}

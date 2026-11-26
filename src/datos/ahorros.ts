import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claveBolsas } from "./bolsas";
import { clavePresupuesto } from "./presupuesto";
import { supabase } from "./supabase";

export type EstadoMeta = "al_dia" | "atrasada" | "cumplida" | "pausada";
export type Frecuencia = "semanal" | "quincenal" | "mensual";

/** Origen de un aporte: una bolsa o un medio directo (Débito, Transferencia). */
export type Origen = { bolsaId: string | null; medioId: string | null; afectaPresupuesto: boolean };

export type Regla = Origen & {
  id: string;
  valor: number;
  frecuencia: Frecuencia;
  dia: number | null;
  proximaFecha: string;
  pausada: boolean;
  origenNombre: string | null;
};

export type Meta = {
  id: string;
  nombre: string;
  icono: string;
  monto: number;
  fechaFinal: string;
  bolsaId: string;
  pausada: boolean;
  /** Derivados en SQL (estado_metas, 3.15). */
  saldo: number;
  ritmoIdeal: number;
  aporteSugerido: number | null;
  fechaProyectada: string | null;
  estado: EstadoMeta;
  regla: Regla | null;
};

export type Pendiente = {
  id: string;
  fecha: string;
  valor: number;
  metaId: string;
  metaNombre: string;
  frecuencia: Frecuencia;
  /** Valor de la regla hoy, para «La regla dice $250.000». */
  valorRegla: number;
  origenNombre: string | null;
};

export type Medio = { id: string; nombre: string };

export const claveAhorros = ["ahorros"] as const;

async function leerMetas(): Promise<Meta[]> {
  const [estados, metas, reglas] = await Promise.all([
    supabase.rpc("estado_metas"),
    supabase.from("metas_ahorro").select("id, icono, bolsa_id, pausada").is("eliminada_at", null),
    supabase
      .from("reglas_aporte")
      .select(
        "id, meta_id, valor, frecuencia, dia, bolsa_id, medio_id, afecta_presupuesto, proxima_fecha, pausada, created_at, bolsa:bolsas(nombre), medio:formas_pago(nombre)",
      )
      .order("created_at"),
  ]);
  for (const r of [estados, metas, reglas]) if (r.error) throw r.error;
  const metaDe = new Map(metas.data!.map((m) => [m.id, m]));
  const reglaDe = new Map<string, Regla>();
  for (const r of reglas.data!) {
    if (reglaDe.has(r.meta_id)) continue;
    reglaDe.set(r.meta_id, {
      id: r.id,
      valor: r.valor,
      frecuencia: r.frecuencia as Frecuencia,
      dia: r.dia,
      bolsaId: r.bolsa_id,
      medioId: r.medio_id,
      afectaPresupuesto: r.afecta_presupuesto,
      proximaFecha: r.proxima_fecha,
      pausada: r.pausada,
      origenNombre: r.bolsa?.nombre ?? r.medio?.nombre ?? null,
    });
  }
  return estados
    .data!.map((e) => {
      const m = metaDe.get(e.meta_id);
      return {
        id: e.meta_id,
        nombre: e.nombre,
        icono: m?.icono ?? "piggy-bank",
        monto: e.monto_meta,
        fechaFinal: e.fecha_final,
        bolsaId: m?.bolsa_id ?? "",
        pausada: m?.pausada ?? false,
        saldo: e.saldo ?? 0,
        ritmoIdeal: e.ritmo_ideal,
        aporteSugerido: e.aporte_sugerido,
        fechaProyectada: e.fecha_proyectada,
        estado: e.estado as EstadoMeta,
        regla: reglaDe.get(e.meta_id) ?? null,
      };
    })
    .sort((a, b) => a.fechaFinal.localeCompare(b.fechaFinal));
}

export const useMetas = () => useQuery({ queryKey: claveAhorros, queryFn: leerMetas });

/** Aportes periódicos generados que esperan confirmación (3.15), del más antiguo al más nuevo. */
export function usePendientes() {
  return useQuery({
    queryKey: [...claveAhorros, "pendientes"],
    queryFn: async (): Promise<Pendiente[]> => {
      const { data, error } = await supabase
        .from("movimientos_bolsa")
        .select(
          "id, fecha, valor, meta_id, meta:metas_ahorro(nombre), regla:reglas_aporte(valor, frecuencia, bolsa:bolsas(nombre), medio:formas_pago(nombre))",
        )
        .eq("estado", "pendiente")
        .not("regla_aporte_id", "is", null)
        .order("fecha");
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        fecha: p.fecha,
        valor: p.valor,
        metaId: p.meta_id!,
        metaNombre: p.meta?.nombre ?? "",
        frecuencia: (p.regla?.frecuencia ?? "mensual") as Frecuencia,
        valorRegla: p.regla?.valor ?? p.valor,
        origenNombre: p.regla?.bolsa?.nombre ?? p.regla?.medio?.nombre ?? null,
      }));
    },
  });
}

/** Suma de los aportes confirmados con fecha dentro del período (tarjeta «Aportes este período»). */
export function useAportesPeriodo(inicio: string | undefined, fin: string | undefined) {
  return useQuery({
    queryKey: [...claveAhorros, "aportesPeriodo", inicio, fin],
    enabled: Boolean(inicio && fin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_bolsa")
        .select("valor")
        .eq("tipo", "aporte")
        .eq("sentido", "entrada")
        .eq("estado", "confirmado")
        .gte("fecha", inicio!)
        .lte("fecha", fin!);
      if (error) throw error;
      return data.reduce((suma, m) => suma + m.valor, 0);
    },
  });
}

/** Medios directos (Débito, Transferencia…) que pueden originar un aporte. */
export function useMedios() {
  return useQuery({
    queryKey: ["medios"],
    queryFn: async (): Promise<Medio[]> => {
      const { data, error } = await supabase
        .from("formas_pago")
        .select("id, nombre")
        .eq("clase", "medio")
        .eq("archivada", false)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });
}

export type Sugerencia = { aportes: number; aporte: number; ultimaFecha: string | null };

/** Aporte sugerido y fecha estimada antes de guardar (sugerir_aporte, supuesto 20). */
export function useSugerirAporte(datos: {
  monto: number | null;
  saldoInicial: number;
  fechaFinal: string | null;
  frecuencia: Frecuencia;
  dia: number | null;
}) {
  const listo = Boolean(datos.monto && datos.fechaFinal);
  return useQuery({
    queryKey: [...claveAhorros, "sugerencia", datos],
    enabled: listo,
    queryFn: async (): Promise<Sugerencia> => {
      const { data, error } = await supabase.rpc("sugerir_aporte", {
        p_monto: datos.monto!,
        p_saldo_inicial: datos.saldoInicial,
        p_fecha_final: datos.fechaFinal!,
        p_frecuencia: datos.frecuencia,
        p_dia: datos.dia ?? 1,
      });
      if (error) throw error;
      const fila = data[0]!;
      return { aportes: fila.aportes, aporte: fila.aporte, ultimaFecha: fila.ultima_fecha };
    },
  });
}

/** Mutación de ahorros: mueven bolsas y, desde un medio que afecta, el presupuesto. */
function useMutacionAhorros<T>(accion: (datos: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (datos: T) => {
      await accion(datos);
    },
    onSettled: () =>
      Promise.all(
        [claveAhorros, claveBolsas, clavePresupuesto].map((queryKey) =>
          cliente.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

const llamar = async (...args: Parameters<typeof supabase.rpc>) => {
  const { error } = await supabase.rpc(...args);
  if (error) throw error;
};

export type DatosMeta = {
  nombre: string;
  icono: string;
  monto: number;
  fechaFinal: string;
  /** Sin regla, la meta no tiene aportes periódicos. */
  regla: (Origen & { valor: number; frecuencia: Frecuencia; dia: number | null }) | null;
};

const argumentosMeta = (d: DatosMeta) => ({
  p_nombre: d.nombre,
  p_icono: d.icono,
  p_monto: d.monto,
  p_fecha_final: d.fechaFinal,
  ...(d.regla && {
    p_valor: d.regla.valor,
    p_frecuencia: d.regla.frecuencia,
    p_dia: d.regla.dia ?? undefined,
    p_bolsa_id: d.regla.bolsaId ?? undefined,
    p_medio_id: d.regla.medioId ?? undefined,
    p_afecta_presupuesto: d.regla.afectaPresupuesto,
  }),
});

export const useCrearMeta = () =>
  useMutacionAhorros((d: DatosMeta & { saldoInicial: number }) =>
    llamar("crear_meta", { ...argumentosMeta(d), p_saldo_inicial: d.saldoInicial }),
  );

export const useEditarMeta = () =>
  useMutacionAhorros((d: DatosMeta & { id: string }) =>
    llamar("editar_meta", { p_meta_id: d.id, ...argumentosMeta(d) }),
  );

export const useAportarMeta = () =>
  useMutacionAhorros((d: Origen & { metaId: string; valor: number }) =>
    llamar("aportar_meta", {
      p_meta_id: d.metaId,
      p_valor: d.valor,
      ...(d.bolsaId && { p_bolsa_id: d.bolsaId }),
      ...(d.medioId && { p_medio_id: d.medioId }),
      p_afecta_presupuesto: d.afectaPresupuesto,
    }),
  );

export const useRetirarMeta = () =>
  useMutacionAhorros((d: { metaId: string; valor: number; bolsaId: string; motivo: string }) =>
    llamar("retirar_meta", {
      p_meta_id: d.metaId,
      p_valor: d.valor,
      p_bolsa_id: d.bolsaId,
      p_motivo: d.motivo,
    }),
  );

export const usePausarMeta = () =>
  useMutacionAhorros((id: string) => llamar("pausar_meta", { p_meta_id: id }));

export const useReanudarMeta = () =>
  useMutacionAhorros((id: string) => llamar("reanudar_meta", { p_meta_id: id }));

export const useEliminarMeta = () =>
  useMutacionAhorros((d: { id: string; bolsaId: string | null }) =>
    llamar("eliminar_meta", { p_meta_id: d.id, ...(d.bolsaId && { p_bolsa_id: d.bolsaId }) }),
  );

export const useConfirmarAporte = () =>
  useMutacionAhorros((d: { id: string; valor?: number; enAdelante?: boolean }) =>
    llamar("confirmar_aporte", {
      p_movimiento_id: d.id,
      ...(d.valor !== undefined && { p_valor: d.valor }),
      p_en_adelante: d.enAdelante ?? false,
    }),
  );

export const useOmitirAporte = () =>
  useMutacionAhorros((id: string) => llamar("omitir_aporte", { p_movimiento_id: id }));

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clavePresupuesto } from "./presupuesto";
import { supabase } from "./supabase";

export type Bolsa = {
  id: string;
  nombre: string;
  /** Saldo derivado de los movimientos (vista saldos_bolsa); puede ser negativo (3.4). */
  saldo: number;
  usos: number;
  /** Fecha (AAAA-MM-DD), título y tipo del último movimiento. */
  ultimo: string | null;
  ultimoTitulo: string | null;
  ultimoTipo: string | null;
  /** Origen de un gasto periódico, una deuda o un aporte periódico activos: no se elimina. */
  enUsoPorReglas: boolean;
};

export const claveBolsas = ["bolsas"] as const;

/** Bolsas activas de forma de pago (sin las de las metas, supuesto 6), por nombre. */
async function leerBolsas(): Promise<Bolsa[]> {
  const [bolsas, saldos, usos] = await Promise.all([
    supabase
      .from("bolsas")
      .select("id, nombre")
      .not("forma_pago_id", "is", null)
      .eq("archivada", false),
    supabase.from("saldos_bolsa").select("bolsa_id, saldo"),
    supabase
      .from("uso_bolsas")
      .select("bolsa_id, usos, ultimo, ultimo_titulo, ultimo_tipo, en_uso_por_reglas"),
  ]);
  for (const r of [bolsas, saldos, usos]) if (r.error) throw r.error;
  const saldoDe = new Map(saldos.data!.map((s) => [s.bolsa_id, s.saldo ?? 0]));
  const usoDe = new Map(usos.data!.map((u) => [u.bolsa_id, u]));
  return bolsas
    .data!.map((b) => {
      const uso = usoDe.get(b.id);
      return {
        id: b.id,
        nombre: b.nombre,
        saldo: saldoDe.get(b.id) ?? 0,
        usos: uso?.usos ?? 0,
        ultimo: uso?.ultimo ?? null,
        ultimoTitulo: uso?.ultimo_titulo ?? null,
        ultimoTipo: uso?.ultimo_tipo ?? null,
        enUsoPorReglas: uso?.en_uso_por_reglas ?? false,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

export function useBolsas() {
  return useQuery({ queryKey: claveBolsas, queryFn: leerBolsas });
}

export type TipoMovimiento =
  | "gasto"
  | "ingreso"
  | "recarga"
  | "traslado"
  | "ajuste"
  | "saldo_inicial"
  | "aporte"
  | "retiro"
  /** Destino del sobrante de un período cerrado (Etapa 6A). */
  | "sobrante";

export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  fecha: string;
  titulo: string | null;
  /** Con signo: + entra a la bolsa, − sale. */
  valor: number;
  /** La otra bolsa, la meta, la categoría del ingreso o el lugar del gasto. */
  contraparte: string | null;
};

/** Todo lo que suma o resta al saldo de una bolsa, del más reciente al más antiguo (supuesto 7). */
export function useMovimientosBolsa(bolsaId: string) {
  return useQuery({
    queryKey: [...claveBolsas, "movimientos", bolsaId],
    queryFn: async (): Promise<Movimiento[]> => {
      const { data, error } = await supabase
        .from("movimientos_de_bolsa")
        .select("id, tipo, fecha, titulo, valor, contraparte")
        .eq("bolsa_id", bolsaId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((m) => ({
        id: m.id!,
        tipo: m.tipo as TipoMovimiento,
        fecha: m.fecha!,
        titulo: m.titulo,
        valor: m.valor ?? 0,
        contraparte: m.contraparte,
      }));
    },
  });
}

/**
 * Saldo de cada bolsa al final de un día (saldos_bolsa_al). Con el día antes del período en curso
 * da «Viene del período anterior» (S6); se recalcula solo si llega un gasto atrasado.
 */
export function useSaldosAl(fecha: string | undefined) {
  return useQuery({
    queryKey: [...claveBolsas, "saldosAl", fecha],
    enabled: Boolean(fecha),
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase.rpc("saldos_bolsa_al", { p_fecha: fecha! });
      if (error) throw error;
      return new Map(data.map((s) => [s.bolsa_id, s.saldo]));
    },
  });
}

/** Mutación de bolsas: refresca bolsas y movimientos, y el presupuesto (un ajuste lo baja). */
function useMutacionBolsas<T, R = void>(accion: (datos: T) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claveBolsas }),
        cliente.invalidateQueries({ queryKey: clavePresupuesto }),
      ]),
  });
}

const rpc = async (...args: Parameters<typeof supabase.rpc>) => {
  const { data, error } = await supabase.rpc(...args);
  if (error) throw error;
  return data as unknown;
};

export const useCrearBolsa = () =>
  useMutacionBolsas(async ({ nombre, saldoInicial }: { nombre: string; saldoInicial: number }) => {
    await rpc("crear_bolsa", { p_nombre: nombre, p_saldo_inicial: saldoInicial });
  });

export const useRenombrarBolsa = () =>
  useMutacionBolsas(async ({ id, nombre }: { id: string; nombre: string }) => {
    await rpc("renombrar_bolsa", { p_bolsa_id: id, p_nombre: nombre });
  });

export const useRecargarBolsa = () =>
  useMutacionBolsas(async ({ id, valor }: { id: string; valor: number }) => {
    await rpc("recargar_bolsa", { p_bolsa_id: id, p_valor: valor });
  });

export const useTrasladar = () =>
  useMutacionBolsas(
    async ({ origen, destino, valor }: { origen: string; destino: string; valor: number }) => {
      await rpc("trasladar", { p_origen: origen, p_destino: destino, p_valor: valor });
    },
  );

export const useAjustarSaldo = () =>
  useMutacionBolsas(async ({ id, saldoReal }: { id: string; saldoReal: number }) => {
    await rpc("ajustar_saldo", { p_bolsa_id: id, p_saldo_real: saldoReal });
  });

/** Sin destino, el saldo queda como ajuste a $0. Devuelve «eliminado» o «archivado». */
export const useEliminarBolsa = () =>
  useMutacionBolsas(async ({ id, destino }: { id: string; destino: string | null }) => {
    return (await rpc("eliminar_bolsa", {
      p_bolsa_id: id,
      ...(destino && { p_destino: destino }),
    })) as "eliminado" | "archivado";
  });

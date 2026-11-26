import { useQuery } from "@tanstack/react-query";
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
    supabase.from("uso_bolsas").select("bolsa_id, usos, ultimo, ultimo_titulo, ultimo_tipo"),
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
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

export function useBolsas() {
  return useQuery({ queryKey: claveBolsas, queryFn: leerBolsas });
}

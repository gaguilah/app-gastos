import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claveAhorros } from "./ahorros";
import { claveBolsas } from "./bolsas";
import { clavePresupuesto } from "./presupuesto";
import { supabase } from "./supabase";

export type OrigenSobrante = "salario" | "presupuesto";

/** Cierre de un período (Etapa 6A, decisiones 6 y 7): los sobrantes se informan por separado. */
export type Cierre = {
  periodoId: string;
  inicio: string;
  fin: string;
  cerradoAt: string | null;
  recerradoAt: string | null;
  salario: number;
  salarioPresupuesto: number;
  presupuesto: number;
  disponible: number;
  sobranteSalario: number;
  sobrantePresupuesto: number;
  /** Lo que se pasó del presupuesto; el sobrante de presupuesto queda en 0 (S5). */
  excedido: number;
  destinadoSalario: number;
  destinadoPresupuesto: number;
  /** Puede ser negativo si un gasto atrasado bajó el sobrante después de destinar (decisión 8). */
  noDestinadoSalario: number;
  noDestinadoPresupuesto: number;
  /** Saldo de cada bolsa al fin del período, del resumen guardado. */
  bolsas: { bolsaId: string; nombre: string; saldo: number }[];
  destinos: Destino[];
};

export type Destino = {
  id: string;
  origen: OrigenSobrante;
  fecha: string;
  valor: number;
  nota: string | null;
  bolsaId: string;
  metaId: string | null;
  /** Nombre de la meta o de la bolsa. */
  nombre: string;
  metaIcono: string | null;
};

export const claveCierre = ["cierre"] as const;

type BolsaResumen = { bolsa_id: string; nombre: string; saldo: number };

async function leerCierre(periodoId: string): Promise<Cierre> {
  const [cierre, destinos, periodo] = await Promise.all([
    supabase.from("cierre_periodos").select("*").eq("periodo_id", periodoId).single(),
    supabase
      .from("destinos_sobrante")
      .select("id, origen, fecha, valor, nota, bolsa_id, meta_id, destino_nombre, meta_icono")
      .eq("periodo_id", periodoId)
      .order("fecha")
      .order("valor", { ascending: false }),
    supabase.from("periodos").select("resumen").eq("id", periodoId).single(),
  ]);
  for (const r of [cierre, destinos, periodo]) if (r.error) throw r.error;
  const c = cierre.data!;
  const resumen = periodo.data!.resumen as { bolsas?: BolsaResumen[] } | null;
  return {
    periodoId,
    inicio: c.fecha_inicio!,
    fin: c.fecha_fin!,
    cerradoAt: c.cerrado_at,
    recerradoAt: c.recerrado_at,
    salario: c.salario ?? 0,
    salarioPresupuesto: c.salario_presupuesto ?? 0,
    presupuesto: c.presupuesto ?? 0,
    disponible: c.disponible ?? 0,
    sobranteSalario: c.sobrante_salario ?? 0,
    sobrantePresupuesto: c.sobrante_presupuesto ?? 0,
    excedido: c.excedido ?? 0,
    destinadoSalario: c.destinado_salario ?? 0,
    destinadoPresupuesto: c.destinado_presupuesto ?? 0,
    noDestinadoSalario: c.no_destinado_salario ?? 0,
    noDestinadoPresupuesto: c.no_destinado_presupuesto ?? 0,
    bolsas: (resumen?.bolsas ?? []).map((b) => ({
      bolsaId: b.bolsa_id,
      nombre: b.nombre,
      saldo: b.saldo,
    })),
    destinos: destinos.data!.map((d) => ({
      id: d.id!,
      origen: d.origen as OrigenSobrante,
      fecha: d.fecha!,
      valor: d.valor ?? 0,
      nota: d.nota,
      bolsaId: d.bolsa_id!,
      metaId: d.meta_id,
      nombre: d.destino_nombre ?? "",
      metaIcono: d.meta_icono,
    })),
  };
}

export function useCierre(periodoId: string | undefined) {
  return useQuery({
    queryKey: [...claveCierre, periodoId],
    enabled: Boolean(periodoId),
    queryFn: () => leerCierre(periodoId!),
  });
}

/** Destinar, editar o quitar un destino cambia el cierre, las bolsas, las metas y el resumen. */
function useMutacionCierre<T>(accion: (datos: T) => Promise<void>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSettled: () =>
      Promise.all(
        [claveCierre, claveBolsas, claveAhorros, clavePresupuesto].map((queryKey) =>
          cliente.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

const llamar = async (...args: Parameters<typeof supabase.rpc>) => {
  const { error } = await supabase.rpc(...args);
  if (error) throw error;
};

export type DatosDestino = {
  periodoId: string;
  origen: OrigenSobrante;
  valor: number;
  /** Una bolsa o una meta, nunca las dos. */
  bolsaId: string | null;
  metaId: string | null;
};

/** Varios destinos a la vez (decisión 7): uno por fila, en orden; si uno falla, se detiene. */
export const useDestinarSobrante = () =>
  useMutacionCierre(async (destinos: DatosDestino[]) => {
    for (const d of destinos)
      await llamar("destinar_sobrante", {
        p_periodo_id: d.periodoId,
        p_origen: d.origen,
        p_valor: d.valor,
        p_bolsa_id: d.bolsaId ?? undefined,
        p_meta_id: d.metaId ?? undefined,
      });
  });

export const useEditarDestino = () =>
  useMutacionCierre(({ id, valor }: { id: string; valor: number }) =>
    llamar("editar_destino", { p_movimiento_id: id, p_valor: valor }),
  );

export const useEliminarDestino = () =>
  useMutacionCierre((id: string) => llamar("eliminar_destino", { p_movimiento_id: id }));

/** Volver a cerrar (decisión 5, S9): rehace el resumen con lo registrado hasta ahora. */
export const useVolverACerrar = () =>
  useMutacionCierre((periodoId: string) => llamar("volver_a_cerrar", { p_periodo_id: periodoId }));

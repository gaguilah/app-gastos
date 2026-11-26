import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claveBolsas } from "./bolsas";
import { clavePresupuesto } from "./presupuesto";
import { supabase } from "./supabase";

export type Ingreso = {
  id: string;
  titulo: string;
  fecha: string;
  valor: number;
  descripcion: string | null;
  categoriaId: string;
  subcategoriaId: string | null;
  /** Copias del momento en que se guardó (historial inmutable). */
  categoriaNombre: string;
  subcategoriaNombre: string | null;
  categoriaIcono: string | null;
  categoriaColor: string | null;
  /** Nula: entra al presupuesto del período (3.5). */
  bolsaId: string | null;
  bolsaNombre: string | null;
  cuentaEstadisticas: boolean;
  /** Ingresos de un préstamo o una deuda: se editan desde su sección (supuesto 16). */
  origen: "prestamo" | "deuda" | null;
};

export type DatosIngreso = {
  titulo: string;
  fecha: string;
  valor: number;
  descripcion: string | null;
  categoriaId: string;
  subcategoriaId: string | null;
  bolsaId: string | null;
};

export const claveIngresos = ["ingresos"] as const;

/** Ingresos con fecha dentro del período, del más reciente al más antiguo. */
export function useIngresos(inicio: string | undefined, fin: string | undefined) {
  return useQuery({
    queryKey: [...claveIngresos, inicio, fin],
    enabled: Boolean(inicio && fin),
    queryFn: async (): Promise<Ingreso[]> => {
      const { data, error } = await supabase
        .from("ingresos")
        .select(
          "id, titulo, fecha, valor, descripcion, categoria_id, subcategoria_id, categoria_nombre, subcategoria_nombre, categoria_icono, categoria_color, bolsa_id, cuenta_estadisticas, prestamo_id, deuda_id, bolsa:bolsas(nombre)",
        )
        .gte("fecha", inicio!)
        .lte("fecha", fin!)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        fecha: i.fecha,
        valor: i.valor,
        descripcion: i.descripcion,
        categoriaId: i.categoria_id,
        subcategoriaId: i.subcategoria_id,
        categoriaNombre: i.categoria_nombre,
        subcategoriaNombre: i.subcategoria_nombre,
        categoriaIcono: i.categoria_icono,
        categoriaColor: i.categoria_color,
        bolsaId: i.bolsa_id,
        bolsaNombre: i.bolsa?.nombre ?? null,
        cuentaEstadisticas: i.cuenta_estadisticas,
        origen: i.prestamo_id ? "prestamo" : i.deuda_id ? "deuda" : null,
      }));
    },
  });
}

/** Totales del período: solo los ingresos que cuentan en estadísticas (supuesto 14). */
export function totalesIngresos(ingresos: Ingreso[]) {
  const contados = ingresos.filter((i) => i.cuentaEstadisticas);
  const presupuesto = contados.filter((i) => !i.bolsaId).reduce((s, i) => s + i.valor, 0);
  const bolsas = contados.filter((i) => i.bolsaId).reduce((s, i) => s + i.valor, 0);
  return { total: presupuesto + bolsas, presupuesto, bolsas };
}

const fila = (d: DatosIngreso) => ({
  titulo: d.titulo,
  fecha: d.fecha,
  valor: d.valor,
  descripcion: d.descripcion,
  categoria_id: d.categoriaId,
  subcategoria_id: d.subcategoriaId,
  bolsa_id: d.bolsaId,
});

/** Mutación de ingresos: cambian el disponible o el saldo de una bolsa. */
function useMutacionIngresos<T>(accion: (datos: T) => Promise<void>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSettled: () =>
      Promise.all(
        [claveIngresos, claveBolsas, clavePresupuesto].map((queryKey) =>
          cliente.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Crea un ingreso, o lo edita si trae id. Las copias de la categoría las pone la base. */
export const useGuardarIngreso = () =>
  useMutacionIngresos(async ({ id, datos }: { id?: string; datos: DatosIngreso }) => {
    const { error } = id
      ? await supabase.from("ingresos").update(fila(datos)).eq("id", id)
      : await supabase.from("ingresos").insert({ ...fila(datos), categoria_nombre: "" });
    if (error) throw error;
  });

export const useEliminarIngreso = () =>
  useMutacionIngresos(async (id: string) => {
    const { error } = await supabase.from("ingresos").delete().eq("id", id);
    if (error) throw error;
  });

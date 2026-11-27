import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claveBolsas } from "./bolsas";
import { claveCierre } from "./cierre";
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
  /** Bolsa a la que entra; nula si no va a ninguna (el salario nunca va, Etapa 6A). */
  bolsaId: string | null;
  bolsaNombre: string | null;
  /** Salario del período y la parte que va al presupuesto (decisión 1). */
  esSalario: boolean;
  montoPresupuesto: number | null;
  /** Ingreso adicional que suma al presupuesto (decisión 3). */
  sumaPresupuesto: boolean;
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
  esSalario: boolean;
  /** Solo en el salario: parte para el presupuesto (≤ valor). */
  montoPresupuesto: number | null;
  /** Solo en un ingreso adicional. */
  sumaPresupuesto: boolean;
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
          "id, titulo, fecha, valor, descripcion, categoria_id, subcategoria_id, categoria_nombre, subcategoria_nombre, categoria_icono, categoria_color, bolsa_id, es_salario, monto_presupuesto, suma_presupuesto, cuenta_estadisticas, prestamo_id, deuda_id, bolsa:bolsas(nombre)",
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
        esSalario: i.es_salario,
        montoPresupuesto: i.monto_presupuesto,
        sumaPresupuesto: i.suma_presupuesto,
        cuentaEstadisticas: i.cuenta_estadisticas,
        origen: i.prestamo_id ? "prestamo" : i.deuda_id ? "deuda" : null,
      }));
    },
  });
}

/** Lo que un ingreso suma al presupuesto: la parte del salario o todo si «Suma al presupuesto». */
export const aportePresupuesto = (i: Ingreso) =>
  i.esSalario ? (i.montoPresupuesto ?? 0) : i.sumaPresupuesto ? i.valor : 0;

/**
 * Totales del período, solo con los ingresos que cuentan en estadísticas (supuesto 14): total,
 * lo que suma al presupuesto y lo que entra a bolsas. Un ingreso puede estar en los dos o en ninguno.
 */
export function totalesIngresos(ingresos: Ingreso[]) {
  const contados = ingresos.filter((i) => i.cuentaEstadisticas);
  const suma = (lista: Ingreso[], valor: (i: Ingreso) => number) =>
    lista.reduce((s, i) => s + valor(i), 0);
  return {
    total: suma(contados, (i) => i.valor),
    presupuesto: suma(contados, aportePresupuesto),
    bolsas: suma(
      contados.filter((i) => i.bolsaId),
      (i) => i.valor,
    ),
  };
}

const fila = (d: DatosIngreso) => ({
  titulo: d.titulo,
  fecha: d.fecha,
  valor: d.valor,
  descripcion: d.descripcion,
  categoria_id: d.categoriaId,
  subcategoria_id: d.subcategoriaId,
  bolsa_id: d.esSalario ? null : d.bolsaId,
  es_salario: d.esSalario,
  monto_presupuesto: d.esSalario ? d.montoPresupuesto : null,
  suma_presupuesto: !d.esSalario && d.sumaPresupuesto,
});

/**
 * Advertencia del gasto atrasado (decisión 8): true si el período cerrado de esa fecha quedó con
 * un sobrante negativo. Se consulta después de guardar; el cambio se guarda igual.
 */
export async function advertenciaSobrante(fecha: string) {
  const { data, error } = await supabase.rpc("advertencia_sobrante", { p_fecha: fecha });
  if (error) throw error;
  return data;
}

/** Mutación de ingresos: cambian el disponible, el saldo de una bolsa y el cierre. */
function useMutacionIngresos<T, R>(accion: (datos: T) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSettled: () =>
      Promise.all(
        [claveIngresos, claveBolsas, clavePresupuesto, claveCierre].map((queryKey) =>
          cliente.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

type Guardar = {
  id?: string;
  datos: DatosIngreso;
  /** Solo al editar un salario: «Desde ahora» también cambia el salario base (decisión 2). */
  desdeAhora?: boolean;
  /** Fecha que tenía al editarlo: si cambió de período, también se revisa el de antes. */
  fechaAnterior?: string;
};

/**
 * Crea un ingreso, o lo edita si trae id. Las copias de la categoría las pone la base.
 * Devuelve si quedó un sobrante negativo en un período cerrado (decisión 8).
 */
export const useGuardarIngreso = () =>
  useMutacionIngresos(async ({ id, datos, desdeAhora, fechaAnterior }: Guardar) => {
    const { error } = id
      ? await supabase.from("ingresos").update(fila(datos)).eq("id", id)
      : await supabase.from("ingresos").insert({ ...fila(datos), categoria_nombre: "" });
    if (error) throw error;
    if (datos.esSalario && desdeAhora) {
      const { error: errorBase } = await supabase.rpc("configurar_salario", {
        p_salario: datos.valor,
        p_presupuesto: datos.montoPresupuesto ?? 0,
      });
      if (errorBase) throw errorBase;
    }
    const fechas = [...new Set([datos.fecha, fechaAnterior].filter((f): f is string => !!f))];
    return (await Promise.all(fechas.map(advertenciaSobrante))).some(Boolean);
  });

/** Elimina un ingreso; devuelve si dejó un sobrante negativo en un período cerrado. */
export const useEliminarIngreso = () =>
  useMutacionIngresos(async ({ id, fecha }: { id: string; fecha: string }) => {
    const { error } = await supabase.from("ingresos").delete().eq("id", id);
    if (error) throw error;
    return advertenciaSobrante(fecha);
  });

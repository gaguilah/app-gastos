import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const tiposCategoria = ["gasto", "ingreso", "prestamo", "deuda"] as const;
export type TipoCategoria = (typeof tiposCategoria)[number];

export type Subcategoria = { id: string; nombre: string; usos: number };

export type Categoria = {
  id: string;
  nombre: string;
  icono: string | null;
  color: string | null;
  tipo: TipoCategoria;
  /** Una de las 6 del sistema (3.14): se edita pero no se elimina. */
  delSistema: boolean;
  usos: number;
  subcategorias: Subcategoria[];
};

export const claveCategorias = ["categorias"] as const;

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });

/** Categorías activas con sus subcategorías y el número de movimientos (vista uso_categorias). */
async function leerCategorias(): Promise<Categoria[]> {
  const [categorias, usos] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre, icono, color, tipo, clave_sistema, padre_id")
      .eq("archivada", false),
    supabase.from("uso_categorias").select("categoria_id, usos"),
  ]);
  if (categorias.error) throw categorias.error;
  if (usos.error) throw usos.error;

  const usosDe = new Map(usos.data.map((u) => [u.categoria_id, u.usos ?? 0]));
  const principales = categorias.data.filter((c) => c.padre_id === null);
  return principales
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      icono: c.icono,
      color: c.color,
      tipo: c.tipo as TipoCategoria,
      delSistema: c.clave_sistema !== null,
      usos: usosDe.get(c.id) ?? 0,
      subcategorias: categorias.data
        .filter((s) => s.padre_id === c.id)
        .map((s) => ({ id: s.id, nombre: s.nombre, usos: usosDe.get(s.id) ?? 0 }))
        .sort(porNombre),
    }))
    .sort(porNombre);
}

export function useCategorias() {
  return useQuery({ queryKey: claveCategorias, queryFn: leerCategorias });
}

export type DatosCategoria = {
  nombre: string;
  icono: string;
  color: string;
  /** Nombres de subcategorías nuevas. */
  nuevas: string[];
};

export type CambiosCategoria = DatosCategoria & {
  id: string;
  /** Subcategorías que se quitan: se eliminan o se archivan según su uso. */
  quitadas: string[];
};

async function crearSubcategorias(padre: { id: string; tipo: string }, nombres: string[]) {
  if (nombres.length === 0) return;
  const { error } = await supabase
    .from("categorias")
    .insert(nombres.map((nombre) => ({ nombre, tipo: padre.tipo, padre_id: padre.id })));
  if (error) throw error;
}

async function eliminar(id: string): Promise<"eliminado" | "archivado"> {
  const { data, error } = await supabase.rpc("eliminar_categoria", { p_id: id });
  if (error) throw error;
  return data === "archivado" ? "archivado" : "eliminado";
}

/** Todas las mutaciones refrescan la lista al terminar, también si fallan a medias. */
function useMutacionCategorias<A, R>(fn: (args: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => cliente.invalidateQueries({ queryKey: claveCategorias }),
  });
}

export function useCrearCategoria() {
  return useMutacionCategorias(async (datos: DatosCategoria & { tipo: TipoCategoria }) => {
    const { data, error } = await supabase
      .from("categorias")
      .insert({ nombre: datos.nombre, icono: datos.icono, color: datos.color, tipo: datos.tipo })
      .select("id, tipo")
      .single();
    if (error) throw error;
    // shortcut: dos llamadas sin transacción. Si fallan las subcategorías, la categoría queda
    // creada y el usuario las agrega al editar. Revisar si se vuelve un problema real.
    await crearSubcategorias(data, datos.nuevas);
  });
}

export function useEditarCategoria() {
  return useMutacionCategorias(async (cambios: CambiosCategoria & { tipo: TipoCategoria }) => {
    const { error } = await supabase
      .from("categorias")
      .update({ nombre: cambios.nombre, icono: cambios.icono, color: cambios.color })
      .eq("id", cambios.id);
    if (error) throw error;
    await crearSubcategorias({ id: cambios.id, tipo: cambios.tipo }, cambios.nuevas);
    for (const id of cambios.quitadas) await eliminar(id);
  });
}

export function useAgregarSubcategoria() {
  return useMutacionCategorias(
    (args: { padre: { id: string; tipo: TipoCategoria }; nombre: string }) =>
      crearSubcategorias(args.padre, [args.nombre]),
  );
}

export function useEliminarCategoria() {
  return useMutacionCategorias(eliminar);
}

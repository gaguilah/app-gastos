import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

/** Las tres listas de /listas. Las bolsas van en su pantalla (Etapa 6, decisión del 25-nov-2026). */
export const listas = ["formas", "lugares", "personas"] as const;
export type Lista = (typeof listas)[number];

/** Subtipo: clase de la forma de pago (medio, canal) o tipo de persona (persona, banco, tarjeta). */
export type Elemento = {
  id: string;
  nombre: string;
  subtipo: string | null;
  usos: number;
  /** Fecha (AAAA-MM-DD) del último uso. */
  ultimo: string | null;
};

export type Listas = Record<Lista, Elemento[]>;

export const claveListas = ["listas"] as const;

const porNombre = (a: Elemento, b: Elemento) =>
  a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });

type Uso = { usos: number | null; ultimo: string | null };
function conUso<T extends { id: string; nombre: string }>(
  filas: T[],
  usos: (Uso & { id: string })[],
  subtipo: (fila: T) => string | null,
): Elemento[] {
  const usoDe = new Map(usos.map((u) => [u.id, u]));
  return filas
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      subtipo: subtipo(f),
      usos: usoDe.get(f.id)?.usos ?? 0,
      ultimo: usoDe.get(f.id)?.ultimo ?? null,
    }))
    .sort(porNombre);
}

async function leerListas(): Promise<Listas> {
  const [formas, usoFormas, lugares, usoLugares, personas, usoPersonas] = await Promise.all([
    supabase
      .from("formas_pago")
      .select("id, nombre, clase")
      .eq("archivada", false)
      .neq("clase", "bolsa"),
    supabase.from("uso_formas_pago").select("id:forma_pago_id, usos, ultimo"),
    supabase.from("lugares").select("id, nombre").eq("archivado", false),
    supabase.from("uso_lugares").select("id:lugar_id, usos, ultimo"),
    supabase.from("personas").select("id, nombre, tipo").eq("archivada", false),
    supabase.from("uso_personas").select("id:persona_id, usos, ultimo"),
  ]);
  for (const r of [formas, usoFormas, lugares, usoLugares, personas, usoPersonas]) {
    if (r.error) throw r.error;
  }
  return {
    formas: conUso(formas.data!, usoFormas.data!, (f) => f.clase),
    lugares: conUso(lugares.data!, usoLugares.data!, () => null),
    personas: conUso(personas.data!, usoPersonas.data!, (p) => p.tipo),
  };
}

export function useListas() {
  return useQuery({ queryKey: claveListas, queryFn: leerListas });
}

/** Solo lugares y personas tienen nombres normalizados y sugerencia de duplicados (3.9). */
export type ListaConDuplicados = Exclude<Lista, "formas">;
const entidad = { lugares: "lugar", personas: "persona" } as const;

export type ParDuplicado = { a: { id: string; nombre: string }; b: { id: string; nombre: string } };

export function usePosiblesDuplicados(lista: Lista) {
  return useQuery({
    queryKey: [...claveListas, "duplicados", lista],
    enabled: lista !== "formas",
    queryFn: async (): Promise<ParDuplicado[]> => {
      const { data, error } = await supabase.rpc("posibles_duplicados", {
        p_entidad: entidad[lista as ListaConDuplicados],
      });
      if (error) throw error;
      return data.map((p) => ({
        a: { id: p.a_id, nombre: p.a_nombre },
        b: { id: p.b_id, nombre: p.b_nombre },
      }));
    },
  });
}

function useMutacionListas<A, R>(fn: (args: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => cliente.invalidateQueries({ queryKey: claveListas }),
  });
}

export type ResultadoCrear = { id: string; estado: "creado" | "existente" | "reactivado" };

/** Lugares y personas se crean o reactivan en SQL; las formas de pago se insertan. */
export function useAgregar() {
  return useMutacionListas(
    async (args: {
      lista: Lista;
      nombre: string;
      subtipo: string | null;
    }): Promise<ResultadoCrear> => {
      if (args.lista === "formas") {
        const { data, error } = await supabase
          .from("formas_pago")
          .insert({ nombre: args.nombre, clase: args.subtipo ?? "medio" })
          .select("id")
          .single();
        if (error) throw error;
        return { id: data.id, estado: "creado" };
      }
      const { data, error } =
        args.lista === "lugares"
          ? await supabase.rpc("crear_lugar", { p_nombre: args.nombre })
          : await supabase.rpc("crear_persona", {
              p_nombre: args.nombre,
              p_tipo: args.subtipo ?? "persona",
            });
      if (error) throw error;
      const fila = data[0]!;
      return { id: fila.id, estado: fila.estado as ResultadoCrear["estado"] };
    },
  );
}

const tabla = { formas: "formas_pago", lugares: "lugares", personas: "personas" } as const;

export function useRenombrar() {
  return useMutacionListas(async (args: { lista: Lista; id: string; nombre: string }) => {
    const { error } = await supabase
      .from(tabla[args.lista])
      .update({ nombre: args.nombre })
      .eq("id", args.id);
    if (error) throw error;
  });
}

const funcionUnir = {
  formas: "unir_formas_pago",
  lugares: "unir_lugares",
  personas: "unir_personas",
} as const;

export function useUnir() {
  return useMutacionListas(async (args: { lista: Lista; origen: string; destino: string }) => {
    const { error } = await supabase.rpc(funcionUnir[args.lista], {
      p_origen: args.origen,
      p_destino: args.destino,
    });
    if (error) throw error;
  });
}

const funcionEliminar = {
  formas: "eliminar_forma_pago",
  lugares: "eliminar_lugar",
  personas: "eliminar_persona",
} as const;

export function useEliminar() {
  return useMutacionListas(
    async (args: { lista: Lista; id: string }): Promise<"eliminado" | "archivado"> => {
      const { data, error } = await supabase.rpc(funcionEliminar[args.lista], { p_id: args.id });
      if (error) throw error;
      return data === "archivado" ? "archivado" : "eliminado";
    },
  );
}

export function useMarcarDistintos() {
  return useMutacionListas(async (args: { lista: ListaConDuplicados; a: string; b: string }) => {
    const { error } = await supabase.rpc("marcar_distintos", {
      p_entidad: entidad[args.lista],
      p_a: args.a,
      p_b: args.b,
    });
    if (error) throw error;
  });
}

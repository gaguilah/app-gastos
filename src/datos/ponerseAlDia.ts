import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

const CLAVE = "ponerseAlDia";

/**
 * Al abrir la app con sesión, una vez por día (supuesto 13 de la Etapa 6): la base de datos
 * asegura el período, genera periódicos, cuotas y aportes pendientes y cierra lo vencido, sin
 * esperar a la tarea de la noche. Después se refresca todo lo que ya estaba en caché.
 */
export function usePonerseAlDia(conSesion: boolean, hoy: string) {
  const cliente = useQueryClient();
  const { isSuccess, dataUpdatedAt } = useQuery({
    queryKey: [CLAVE, hoy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ponerse_al_dia");
      if (error) throw error;
      return data;
    },
    enabled: conSesion,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  useEffect(() => {
    if (isSuccess) {
      void cliente.invalidateQueries({ predicate: (q) => q.queryKey[0] !== CLAVE });
    }
  }, [cliente, isSuccess, dataUpdatedAt]);
}

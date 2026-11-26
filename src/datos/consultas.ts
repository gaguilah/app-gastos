import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

/** Caché de datos del servidor. Un solo cliente por app; las pruebas crean el suyo. */
export function crearClienteConsultas() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}

/** Al cerrar sesión (también en otra pestaña) se borra la caché: nada queda del usuario anterior. */
export function limpiarAlCerrarSesion(cliente: QueryClient) {
  const { data } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") cliente.clear();
  });
  return () => data.subscription.unsubscribe();
}

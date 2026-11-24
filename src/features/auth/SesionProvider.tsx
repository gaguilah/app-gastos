import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/datos/supabase";
import { SesionContext, type EstadoSesion } from "./contexto";

/** Sigue la sesión de Supabase: inicio, cierre (también en otra pestaña), vencimiento y recuperación. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({
    cargando: true,
    sesion: null,
    recuperando: false,
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      setEstado((previo) => ({
        cargando: false,
        sesion,
        recuperando:
          evento === "PASSWORD_RECOVERY" || (previo.recuperando && evento !== "SIGNED_OUT"),
      }));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SesionContext value={estado}>{children}</SesionContext>;
}

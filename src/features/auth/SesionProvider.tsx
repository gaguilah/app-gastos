import { useEffect, useState, type ReactNode } from "react";
import { llegoDesdeRecuperacion, supabase } from "@/datos/supabase";
import { SesionContext, type EstadoSesion } from "./contexto";

// La recuperación sobrevive a una recarga de /nueva-contrasena (solo en esta pestaña).
const CLAVE_RECUPERANDO = "app-gastos.recuperando";

function leerRecuperando(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_RECUPERANDO) === "1";
  } catch {
    return false;
  }
}

function guardarRecuperando(valor: boolean) {
  try {
    if (valor) sessionStorage.setItem(CLAVE_RECUPERANDO, "1");
    else sessionStorage.removeItem(CLAVE_RECUPERANDO);
  } catch {
    // Sin almacenamiento, la recuperación dura hasta recargar.
  }
}

/** Sigue la sesión de Supabase: inicio, cierre (también en otra pestaña), vencimiento y recuperación. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(() => ({
    cargando: true,
    sesion: null,
    // Desde el inicio, sin esperar el evento PASSWORD_RECOVERY: puede llegar después de la sesión.
    recuperando: llegoDesdeRecuperacion || leerRecuperando(),
  }));

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      setEstado((previo) => {
        const recuperando =
          sesion !== null &&
          (evento === "PASSWORD_RECOVERY" ||
            (previo.recuperando && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED"));
        guardarRecuperando(recuperando);
        return { cargando: false, sesion, recuperando };
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SesionContext value={estado}>{children}</SesionContext>;
}

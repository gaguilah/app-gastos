import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type EstadoSesion = {
  /** true hasta que Supabase dice si hay sesión guardada: evita un parpadeo del login. */
  cargando: boolean;
  sesion: Session | null;
  /** La sesión la abrió un enlace de recuperación de contraseña. */
  recuperando: boolean;
};

export const SesionContext = createContext<EstadoSesion>({
  cargando: true,
  sesion: null,
  recuperando: false,
});

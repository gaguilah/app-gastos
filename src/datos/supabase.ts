import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !clave) {
  throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (ver .env.example).");
}

/**
 * El enlace del correo de recuperación llega con `type=recovery` en el hash. Se lee aquí, antes
 * de crear el cliente, porque Supabase lo borra de la URL al abrir la sesión.
 */
export const llegoDesdeRecuperacion = window.location.hash.includes("type=recovery");

/** Único cliente de la app. Solo la clave publicable: la secreta nunca llega al navegador. */
export const supabase = createClient<Database>(url, clave, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // El enlace de recuperación vuelve con la sesión en la URL y la abre sola. Flujo implícito
    // (no PKCE) para que el enlace funcione aunque el correo se abra en otro dispositivo.
    detectSessionInUrl: true,
    flowType: "implicit",
  },
});

/** Las únicas pantallas sin sesión. No hay registro: el usuario se crea a mano en Supabase. */
export const RUTAS_PUBLICAS = ["/login", "/recuperar", "/nueva-contrasena"] as const;

export function esRutaPublica(ruta: string): boolean {
  return (RUTAS_PUBLICAS as readonly string[]).includes(ruta);
}

/** A dónde ir después de iniciar sesión: la ruta pedida si es interna y protegida; si no, Inicio. */
export function destinoTrasLogin(desde: string | null): string {
  if (!desde || !desde.startsWith("/") || desde.startsWith("//") || desde.startsWith("/\\")) {
    return "/";
  }
  const ruta = desde.split(/[?#]/)[0] ?? "/";
  return esRutaPublica(ruta) ? "/" : desde;
}

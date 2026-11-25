/** Las únicas pantallas sin sesión. No hay registro: el usuario se crea a mano en Supabase. */
export const RUTAS_PUBLICAS = ["/login", "/recuperar", "/nueva-contrasena"] as const;

export function esRutaPublica(ruta: string): boolean {
  return (RUTAS_PUBLICAS as readonly string[]).includes(ruta);
}

// Origen ficticio: solo sirve para que el lector de URL diga si el destino sale del sitio.
const ORIGEN_INTERNO = "https://app-gastos.interno";

/** A dónde ir después de iniciar sesión: la ruta pedida si es interna y protegida; si no, Inicio. */
export function destinoTrasLogin(desde: string | null): string {
  // Se interpreta como lo haría el navegador (que, por ejemplo, borra tabuladores y saltos de línea).
  if (!desde?.startsWith("/")) return "/";
  const url = new URL(desde, ORIGEN_INTERNO);
  if (url.origin !== ORIGEN_INTERNO || esRutaPublica(url.pathname)) return "/";
  return url.pathname + url.search + url.hash;
}

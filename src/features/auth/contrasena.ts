/** Igual que `minimum_password_length` en supabase/config.toml. */
export const LONGITUD_MINIMA_CONTRASENA = 8;

/** Devuelve la clave de i18n del error, o null si la contraseña nueva es válida. */
export function validarNuevaContrasena(contrasena: string, confirmacion: string): string | null {
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) return "recuperar.error.corta";
  if (contrasena !== confirmacion) return "recuperar.error.noCoinciden";
  return null;
}

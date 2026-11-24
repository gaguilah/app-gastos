import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/** Traduce un error de inicio de sesión a una clave de i18n. Nunca se muestra el texto crudo. */
export function claveErrorLogin(error: unknown): string {
  if (isAuthRetryableFetchError(error) || error instanceof TypeError) return "login.error.sinRed";
  if (isAuthApiError(error)) {
    if (error.code === "invalid_credentials") return "login.error.credenciales";
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return "login.error.demasiadosIntentos";
    }
  }
  return "login.error.desconocido";
}

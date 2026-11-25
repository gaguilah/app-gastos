// Errores de la base de datos traducidos a claves de i18n. Nunca se muestra el texto crudo.
// Las funciones de la Etapa 3 y 5 lanzan P0001 (regla) o P0002 (no existe) con una clave.

/** Claves que lanzan las funciones SQL y que tienen texto en errores.servidor. */
const clavesServidor = [
  "lugar.nombre_vacio",
  "lugar.no_existe",
  "persona.nombre_vacio",
  "persona.tipo_invalido",
  "persona.no_existe",
  "forma_pago.no_existe",
  "categoria.no_existe",
  "categoria.sistema",
  "unir.mismo",
  "unir.tipo_distinto",
  "unir.clase_distinta",
  "duplicado.entidad_invalida",
  "duplicado.no_existe",
] as const;

type ErrorPostgrest = { code?: unknown; message?: unknown };

function esErrorPostgrest(error: unknown): error is ErrorPostgrest {
  return typeof error === "object" && error !== null && "code" in error;
}

export function claveErrorDatos(error: unknown): string {
  if (error instanceof TypeError) return "errores.sinRed";
  if (!esErrorPostgrest(error)) return "errores.desconocido";
  const { code, message } = error;
  if ((code === "P0001" || code === "P0002") && typeof message === "string") {
    const clave = clavesServidor.find((c) => c === message);
    if (clave) return `errores.servidor.${clave.replace(".", "_")}`;
  }
  if (code === "23505") return "errores.nombreRepetido";
  if (code === "23514") return "errores.datoInvalido";
  if (code === "42501") return "errores.sinPermiso";
  return "errores.desconocido";
}

export const clavesErrorServidor = clavesServidor.map(
  (c) => `errores.servidor.${c.replace(".", "_")}`,
);

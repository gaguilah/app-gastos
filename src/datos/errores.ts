// Errores de la base de datos traducidos a claves de i18n. Nunca se muestra el texto crudo.
// Las funciones de las Etapas 3, 5 y 6 lanzan P0001 (regla) o P0002 (no existe) con una clave.

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
  "bolsa.no_existe",
  "bolsa.nombre_repetido",
  "bolsa.en_uso_por_reglas",
  "movimiento.valor_invalido",
  "traslado.misma_bolsa",
  "periodo.dia_invalido",
  "periodo.no_existe",
  "periodo.cerrado",
  "presupuesto.valor_invalido",
  "ajuste.saldo_invalido",
  "meta.no_existe",
  "meta.monto_invalido",
  "meta.fecha_invalida",
  "meta.saldo_insuficiente",
  "meta.destino_requerido",
  "aporte.origen_invalido",
  "aporte.afecta_desde_bolsa",
  "aporte.no_existe",
  "pendiente.ya_confirmado",
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
  // personas_nombre_check rechaza 13 o más dígitos seguidos: nunca números de tarjeta (3.8).
  if (
    code === "23514" &&
    typeof message === "string" &&
    message.includes("personas_nombre_check")
  ) {
    return "errores.numeroTarjeta";
  }
  if (code === "23514") return "errores.datoInvalido";
  if (code === "42501") return "errores.sinPermiso";
  return "errores.desconocido";
}

export const clavesErrorServidor = clavesServidor.map(
  (c) => `errores.servidor.${c.replace(".", "_")}`,
);

/** Nombre normalizado repetido (restricción única): la pantalla puede ofrecer unir. */
export const esNombreRepetido = (error: unknown) =>
  esErrorPostgrest(error) && error.code === "23505";

// Dinero en pantalla (DESIGN.md §5): pesos enteros, un solo formato para toda la app.
// El cálculo del disponible vive en SQL (disponible_periodo); aquí solo se presenta.

const miles = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0, useGrouping: "always" });

/** «$2.845.000», «−$7.300»; con `signo`, «+$350.000». Igual en los dos idiomas. */
export function formatearPesos(valor: number, opciones: { signo?: boolean } = {}) {
  const signo = valor < 0 ? "−" : opciones.signo && valor > 0 ? "+" : "";
  return `${signo}$${miles.format(Math.abs(valor))}`;
}

/** Tope razonable para un monto escrito: 100 mil millones. */
export const MAXIMO_PESOS = 100_000_000_000;

/**
 * Lee un monto escrito («35.000», «$ 35000», «35 000»). Devuelve null si no es un entero válido:
 * no hay centavos, así que «12,5» o «12.5» no valen. Con `negativo`, acepta «-» o «−» al inicio.
 */
export function leerPesos(texto: string, opciones: { negativo?: boolean } = {}): number | null {
  let limpio = texto.replace(/[\s$]/g, "");
  let negativo = false;
  if (/^[-−]/.test(limpio)) {
    if (!opciones.negativo) return null;
    negativo = true;
    limpio = limpio.slice(1);
  }
  // Solo dígitos, con puntos de miles bien puestos o sin ellos.
  if (!/^\d+$/.test(limpio) && !/^\d{1,3}(\.\d{3})+$/.test(limpio)) return null;
  const valor = Number(limpio.replace(/\./g, ""));
  if (valor > MAXIMO_PESOS) return null;
  return negativo ? -valor : valor;
}

/** Porcentaje usado en enteros hacia abajo, con la misma fórmula de las alertas en SQL. */
export function porcentajeUsado(usado: number, base: number) {
  if (base <= 0) return 0;
  return Math.floor((usado * 100) / base);
}

export type UmbralAlerta = "70" | "75" | "80" | "85" | "90" | "95" | "100" | "superado";

/** Último umbral alcanzado (token alerta-*), o null por debajo del 70 % (3.2). */
export function umbralAlerta(porcentaje: number): UmbralAlerta | null {
  if (porcentaje > 100) return "superado";
  if (porcentaje < 70) return null;
  return String(Math.floor(porcentaje / 5) * 5) as UmbralAlerta;
}

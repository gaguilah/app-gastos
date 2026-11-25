// Sin React ni Supabase: lo importan las rutas, la navegación y las pruebas E2E.

/** Destinos de la app (todos protegidos). `titulo` es la clave de i18n del menú. */
export const modulos = [
  { ruta: "/", titulo: "nav.inicio" },
  { ruta: "/gastos", titulo: "nav.gastos" },
  { ruta: "/gastos/nuevo", titulo: "nav.registrarGasto" },
  { ruta: "/reportes", titulo: "nav.reportes" },
  { ruta: "/ingresos", titulo: "nav.ingresos" },
  { ruta: "/bolsas", titulo: "nav.bolsas" },
  { ruta: "/ahorros", titulo: "nav.ahorros" },
  { ruta: "/categorias", titulo: "nav.categorias" },
  { ruta: "/presupuesto", titulo: "nav.presupuesto" },
  { ruta: "/periodicos", titulo: "nav.periodicos" },
  { ruta: "/prestamos", titulo: "nav.prestamos" },
  { ruta: "/deudas", titulo: "nav.deudas" },
  { ruta: "/listas", titulo: "nav.listas" },
] as const;

/** Toda ruta que exige sesión, para que las pruebas E2E cubran una ruta nueva sola. */
export const rutasProtegidas = [...modulos.map((m) => m.ruta), "/mas", "/ajustes"];

/** Parámetro con la ruta pedida antes de ir al login. */
export const PARAMETRO_SIGUIENTE = "siguiente";

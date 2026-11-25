import {
  Banknote,
  CalendarDays,
  ChartColumn,
  HandCoins,
  House,
  Landmark,
  List,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat,
  SlidersHorizontal,
  Tag,
  Wallet,
} from "lucide-react";

export type ItemNavegacion = {
  ruta: string;
  /** Etiqueta corta del menú lateral. */
  etiqueta: string;
  /** Nombre completo (lista de «Más» y títulos). */
  titulo: string;
  Icono: LucideIcon;
};

const item = (ruta: string, clave: string, Icono: LucideIcon, corta = false): ItemNavegacion => ({
  ruta,
  etiqueta: corta ? `menu.${clave}` : `nav.${clave}`,
  titulo: `nav.${clave}`,
  Icono,
});

// Orden del lienzo (menú lateral de tablet y computador).
export const menuLateral: ItemNavegacion[] = [
  item("/", "inicio", House),
  item("/gastos", "gastos", Receipt),
  item("/ingresos", "ingresos", Banknote),
  item("/bolsas", "bolsas", Wallet),
  item("/ahorros", "ahorros", PiggyBank),
  item("/categorias", "categorias", Tag),
  item("/reportes", "reportes", ChartColumn),
  item("/presupuesto", "presupuesto", CalendarDays, true),
  item("/periodicos", "periodicos", Repeat, true),
  item("/prestamos", "prestamos", HandCoins, true),
  item("/deudas", "deudas", Landmark),
  item("/listas", "listas", List, true),
  item("/ajustes", "ajustes", SlidersHorizontal),
];

const porRuta = (ruta: string) => menuLateral.find((i) => i.ruta === ruta)!;

/** Barra inferior del móvil: el botón central Registrar y «Más» se dibujan aparte. */
export const barraInferior = ["/", "/gastos", "/reportes"].map(porRuta);

/** Lista de «Más» (DESIGN.md §3): diez destinos con su nombre completo. */
export const listaMas = [
  "/ingresos",
  "/bolsas",
  "/ahorros",
  "/categorias",
  "/presupuesto",
  "/periodicos",
  "/prestamos",
  "/deudas",
  "/listas",
  "/ajustes",
].map(porRuta);

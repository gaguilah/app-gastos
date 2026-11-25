import {
  Baby,
  Banknote,
  Beer,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  CircleHelp,
  CircleX,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tag,
  TrainFront,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import paleta from "./paleta-categorias.json";

/**
 * Íconos que se pueden elegir para una categoría (supuesto 9 de la Etapa 5). La categoría guarda
 * solo el nombre (DESIGN.md §7); cada ícono se importa por separado para no cargar toda la
 * librería. El orden es el de la rejilla del selector.
 */
export const iconosCategoria = {
  utensils: Utensils,
  car: Car,
  house: House,
  zap: Zap,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  clapperboard: Clapperboard,
  shirt: Shirt,
  repeat: Repeat,
  "paw-print": PawPrint,
  coffee: Coffee,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  pizza: Pizza,
  beer: Beer,
  bus: Bus,
  "train-front": TrainFront,
  bike: Bike,
  fuel: Fuel,
  plane: Plane,
  pill: Pill,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  baby: Baby,
  "book-open": BookOpen,
  music: Music,
  "gamepad-2": Gamepad2,
  tv: Tv,
  wifi: Wifi,
  smartphone: Smartphone,
  wrench: Wrench,
  scissors: Scissors,
  gift: Gift,
  "building-2": Building2,
  receipt: Receipt,
  briefcase: Briefcase,
  sparkles: Sparkles,
  tag: Tag,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "hand-coins": HandCoins,
  landmark: Landmark,
  banknote: Banknote,
  "circle-x": CircleX,
  "circle-help": CircleHelp,
  ellipsis: Ellipsis,
} satisfies Record<string, LucideIcon>;

export type NombreIcono = keyof typeof iconosCategoria;

export const nombresIconos = Object.keys(iconosCategoria) as NombreIcono[];

/** Un nombre guardado que ya no está en la lista se muestra con «Otros» (ellipsis). */
export function iconoDe(nombre: string | null | undefined): LucideIcon {
  return (nombre && iconosCategoria[nombre as NombreIcono]) || Ellipsis;
}

/**
 * Colores de categoría de DESIGN.md §2.1. Son datos que se guardan en la categoría (en hex,
 * como exige la tabla), no tokens de la interfaz; por eso viven en un JSON y no en index.css.
 */
export const paletaCategorias: readonly { clave: string; hex: string }[] = paleta;

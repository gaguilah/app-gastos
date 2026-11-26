import type { TFunction } from "i18next";
import type { Ingreso } from "@/datos/ingresos";

export const destinoIngreso = (i: Ingreso, t: TFunction) =>
  i.bolsaNombre ?? t("ingresos.destino.presupuesto");

export const categoriaIngreso = (i: Ingreso) =>
  i.subcategoriaNombre ? `${i.categoriaNombre} · ${i.subcategoriaNombre}` : i.categoriaNombre;

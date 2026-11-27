import type { TFunction } from "i18next";
import { aportePresupuesto, type Ingreso } from "@/datos/ingresos";
import { formatearPesos } from "@/dominio/dinero";

/** «Salario», «Nequi», «Nequi + presupuesto», «Presupuesto» o «Sin bolsa» (Etapa 6A). */
export function destinoIngreso(i: Ingreso, t: TFunction) {
  if (i.esSalario) return t("ingresos.destino.salario");
  if (i.bolsaNombre)
    return i.sumaPresupuesto
      ? t("ingresos.destino.bolsaYPresupuesto", { nombre: i.bolsaNombre })
      : i.bolsaNombre;
  return t(i.sumaPresupuesto ? "ingresos.destino.presupuesto" : "ingresos.destino.ninguno");
}

/** Qué efecto tuvo el ingreso en el presupuesto y en su bolsa. */
export function efectoIngreso(i: Ingreso, t: TFunction) {
  const valor = formatearPesos(i.valor);
  if (i.esSalario) {
    const monto = aportePresupuesto(i);
    return t("ingresos.detalle.efectoSalario", {
      monto: formatearPesos(monto),
      resto: formatearPesos(i.valor - monto),
    });
  }
  if (i.bolsaNombre)
    return t(
      i.sumaPresupuesto
        ? "ingresos.detalle.efectoBolsaPresupuesto"
        : "ingresos.detalle.efectoBolsa",
      { valor, nombre: i.bolsaNombre },
    );
  return t(
    i.sumaPresupuesto ? "ingresos.detalle.efectoPresupuesto" : "ingresos.detalle.efectoNinguno",
    { valor },
  );
}

export const categoriaIngreso = (i: Ingreso) =>
  i.subcategoriaNombre ? `${i.categoriaNombre} · ${i.subcategoriaNombre}` : i.categoriaNombre;

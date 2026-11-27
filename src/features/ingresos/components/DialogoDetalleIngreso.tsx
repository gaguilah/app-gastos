import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { Ventana } from "@/components/shared/Ventana";
import type { Ingreso } from "@/datos/ingresos";
import { formatearPesos } from "@/dominio/dinero";
import { fechaLarga } from "@/dominio/fechas";
import { categoriaIngreso, destinoIngreso, efectoIngreso } from "../textos";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  ingreso: Ingreso;
  alEditar: () => void;
};

/** Detalle: fecha completa, destino y qué efecto tuvo el ingreso. */
export function DialogoDetalleIngreso({ abierta, alCambiar, ingreso, alEditar }: Props) {
  const { t, i18n } = useTranslation();
  const filas = [
    ["fecha", fechaLarga(ingreso.fecha, i18n.language)],
    ["destino", destinoIngreso(ingreso, t)],
    ["efecto", efectoIngreso(ingreso, t)],
    ...(ingreso.descripcion ? [["descripcion", ingreso.descripcion] as const] : []),
  ] as const;

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("ingresos.detalle.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cerrar")}
          </Button>
          {!ingreso.origen && <Button onClick={alEditar}>{t("ingresos.acciones.editar")}</Button>}
        </>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        <div className="flex items-center gap-md">
          <IconoCategoria icono={ingreso.categoriaIcono} color={ingreso.categoriaColor} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-center gap-sm">
              <span className="text-title">{ingreso.titulo}</span>
              {ingreso.origen && <Badge>{t(`ingresos.origen.${ingreso.origen}`)}</Badge>}
            </span>
            <span className="text-body-sm text-muted-foreground">{categoriaIngreso(ingreso)}</span>
          </div>
          <span className="font-mono text-amount-kpi text-success tabular-nums">
            {formatearPesos(ingreso.valor, { signo: true })}
          </span>
        </div>
        <dl className="flex flex-col rounded-card border">
          {filas.map(([clave, texto]) => (
            <div key={clave} className="flex flex-col gap-xs border-t px-md py-sm first:border-t-0">
              <dt className="text-body-sm text-muted-foreground">
                {t(`ingresos.detalle.${clave}`)}
              </dt>
              <dd className="text-body-md">{texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Ventana>
  );
}

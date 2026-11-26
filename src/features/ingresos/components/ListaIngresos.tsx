import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MenuAcciones, type Accion } from "@/components/shared/MenuAcciones";
import type { Ingreso } from "@/datos/ingresos";
import { formatearPesos } from "@/dominio/dinero";
import { fechaCorta } from "@/dominio/fechas";
import { useEsComputador } from "@/lib/useEsComputador";
import { categoriaIngreso, destinoIngreso } from "../textos";

export type AccionIngreso = "detalle" | "editar" | "eliminar";

type Props = {
  ingresos: Ingreso[];
  hoy: string;
  alElegir: (accion: AccionIngreso, ingreso: Ingreso) => void;
};

/** Tabla en computador y tarjetas en móvil y tablet; montos con + en success (DESIGN.md §4). */
export function ListaIngresos({ ingresos, hoy, alElegir }: Props) {
  const { t, i18n } = useTranslation();
  const esComputador = useEsComputador();
  const fecha = (dia: string) => {
    const f = fechaCorta(dia, hoy, i18n.language);
    return "clave" in f ? t(f.clave) : f.texto;
  };

  const menu = (i: Ingreso) => {
    const bloqueado = i.origen ? t("ingresos.origen.bloqueado") : undefined;
    const acciones: Accion[] = [
      {
        clave: "detalle",
        etiqueta: t("ingresos.acciones.detalle"),
        icono: <Eye aria-hidden="true" />,
        alElegir: () => alElegir("detalle", i),
      },
      {
        clave: "editar",
        etiqueta: t("ingresos.acciones.editar"),
        icono: <Pencil aria-hidden="true" />,
        alElegir: () => alElegir("editar", i),
        deshabilitada: bloqueado,
      },
      {
        clave: "eliminar",
        etiqueta: t("ingresos.acciones.eliminar"),
        icono: <Trash2 aria-hidden="true" />,
        alElegir: () => alElegir("eliminar", i),
        destructiva: true,
        deshabilitada: bloqueado,
      },
    ];
    return (
      <MenuAcciones
        titulo={i.titulo}
        etiqueta={t("comun.acciones", { nombre: i.titulo })}
        acciones={acciones}
      />
    );
  };
  const titulo = (i: Ingreso) => (
    <span className="flex flex-wrap items-center gap-sm">
      <span className="text-title">{i.titulo}</span>
      {i.origen && <Badge>{t(`ingresos.origen.${i.origen}`)}</Badge>}
    </span>
  );
  const valor = (i: Ingreso) => (
    <span className="font-mono text-success tabular-nums">
      {formatearPesos(i.valor, { signo: true })}
    </span>
  );

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ingresos.columnas.fecha")}</TableHead>
              <TableHead>{t("ingresos.columnas.ingreso")}</TableHead>
              <TableHead>{t("ingresos.columnas.categoria")}</TableHead>
              <TableHead>{t("ingresos.columnas.destino")}</TableHead>
              <TableHead className="text-right">{t("ingresos.columnas.valor")}</TableHead>
              <TableHead className="w-touch">
                <span className="sr-only">{t("ingresos.columnas.acciones")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingresos.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-muted-foreground">{fecha(i.fecha)}</TableCell>
                <TableCell>{titulo(i)}</TableCell>
                <TableCell>{categoriaIngreso(i)}</TableCell>
                <TableCell>{destinoIngreso(i, t)}</TableCell>
                <TableCell className="text-right">{valor(i)}</TableCell>
                <TableCell>{menu(i)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {ingresos.map((i) => (
        <li key={i.id} className="flex items-center gap-sm rounded-card border bg-card p-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            {titulo(i)}
            <span className="text-body-sm text-muted-foreground">
              {`${fecha(i.fecha)} · ${categoriaIngreso(i)}`}
            </span>
          </div>
          <div className="flex flex-col items-end gap-xs">
            {valor(i)}
            <span className="text-body-sm text-muted-foreground">
              {t("ingresos.destino.hacia", { destino: destinoIngreso(i, t) })}
            </span>
          </div>
          {menu(i)}
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from "react";
import { Eye, Minus, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
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
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { MenuAcciones, type Accion } from "@/components/shared/MenuAcciones";
import type { Meta } from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";
import { fechaCorta } from "@/dominio/fechas";
import { useEsComputador } from "@/lib/useEsComputador";
import { aporteCorto, varianteEstadoMeta } from "../textos";
import { BarraMeta } from "./BarraMeta";

export type AccionMeta =
  "detalle" | "aportar" | "retirar" | "editar" | "pausar" | "reanudar" | "eliminar";

type Props = {
  metas: Meta[];
  hoy: string;
  alElegir: (accion: AccionMeta, meta: Meta) => void;
};

/** Metas con avance, aporte, fecha final y estado con palabra (3.15). */
export function ListaMetas({ metas, hoy, alElegir }: Props) {
  const { t, i18n } = useTranslation();
  const esComputador = useEsComputador();
  const fecha = (dia: string) => {
    const f = fechaCorta(dia, hoy, i18n.language);
    return "clave" in f ? t(f.clave) : f.texto;
  };
  const insignia = (m: Meta) => (
    <Badge variant={varianteEstadoMeta[m.estado]}>{t(`ahorros.estado.${m.estado}`)}</Badge>
  );
  const avance = (m: Meta) =>
    t("ahorros.avance", { saldo: formatearPesos(m.saldo), monto: formatearPesos(m.monto) });

  const menu = (m: Meta) => {
    const accion = (
      clave: AccionMeta,
      icono: ReactNode,
      etiqueta = t(`ahorros.acciones.${clave}`),
    ): Accion => ({
      clave,
      etiqueta,
      icono,
      alElegir: () => alElegir(clave, m),
    });
    const cumplida = m.estado === "cumplida";
    const acciones: Accion[] = [
      accion("detalle", <Eye aria-hidden="true" />),
      ...(cumplida ? [] : [accion("aportar", <Plus aria-hidden="true" />)]),
      {
        ...accion(
          "retirar",
          <Minus aria-hidden="true" />,
          t(cumplida ? "ahorros.acciones.retirarCumplida" : "ahorros.acciones.retirar"),
        ),
        deshabilitada: m.saldo <= 0 ? t("ahorros.acciones.sinSaldo") : undefined,
      },
      accion("editar", <Pencil aria-hidden="true" />),
      m.pausada
        ? accion("reanudar", <Play aria-hidden="true" />)
        : accion("pausar", <Pause aria-hidden="true" />),
      { ...accion("eliminar", <Trash2 aria-hidden="true" />), destructiva: true },
    ];
    return (
      <MenuAcciones
        titulo={m.nombre}
        etiqueta={t("comun.acciones", { nombre: m.nombre })}
        acciones={acciones}
      />
    );
  };
  const nombre = (m: Meta) => (
    <span className="flex items-center gap-sm">
      <IconoCategoria icono={m.icono} color={null} className="bg-accent text-accent-foreground" />
      <span className="text-title">{m.nombre}</span>
    </span>
  );

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ahorros.columnas.meta")}</TableHead>
              <TableHead className="w-1/4">{t("ahorros.columnas.avance")}</TableHead>
              <TableHead>{t("ahorros.columnas.aporte")}</TableHead>
              <TableHead>{t("ahorros.columnas.fechaFinal")}</TableHead>
              <TableHead>{t("ahorros.columnas.estado")}</TableHead>
              <TableHead className="w-touch">
                <span className="sr-only">{t("ahorros.columnas.acciones")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metas.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{nombre(m)}</TableCell>
                <TableCell>
                  <span className="block font-mono text-body-sm tabular-nums">{avance(m)}</span>
                  <BarraMeta saldo={m.saldo} monto={m.monto} />
                </TableCell>
                <TableCell className="font-mono tabular-nums">{aporteCorto(m, t)}</TableCell>
                <TableCell>{fecha(m.fechaFinal)}</TableCell>
                <TableCell>{insignia(m)}</TableCell>
                <TableCell>{menu(m)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {metas.map((m) => (
        <li key={m.id} className="flex flex-col gap-sm rounded-card border bg-card p-md">
          <div className="flex items-center gap-sm">
            <div className="min-w-0 flex-1">{nombre(m)}</div>
            {insignia(m)}
            {menu(m)}
          </div>
          <BarraMeta saldo={m.saldo} monto={m.monto} />
          <p className="text-body-sm text-muted-foreground">
            {t("ahorros.ahorrado", {
              saldo: formatearPesos(m.saldo),
              monto: formatearPesos(m.monto),
            })}
          </p>
          <p className="flex flex-wrap justify-between gap-sm text-body-sm text-muted-foreground">
            <span>{aporteCorto(m, t)}</span>
            <span>{t("ahorros.hasta", { fecha: fecha(m.fechaFinal) })}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

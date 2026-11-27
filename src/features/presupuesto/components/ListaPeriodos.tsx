import { Link } from "react-router";
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
import { BarraPresupuesto } from "@/components/shared/BarraPresupuesto";
import type { Periodo } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";
import { rangoPeriodo } from "@/dominio/fechas";
import { useEsComputador } from "@/lib/useEsComputador";
import { estadoPeriodo, varianteEstado } from "../estado";

type Props = {
  periodos: Periodo[];
  /** Id del período en curso. */
  enCursoId?: string;
};

/** Períodos del más reciente al más antiguo: tabla en computador, tarjetas en móvil y tablet. */
export function ListaPeriodos({ periodos, enCursoId }: Props) {
  const { t, i18n } = useTranslation();
  const esComputador = useEsComputador();

  const insignia = (p: Periodo) => {
    const estado = estadoPeriodo(p, p.id === enCursoId);
    return <Badge variant={varianteEstado[estado]}>{t(`presupuesto.estado.${estado}`)}</Badge>;
  };
  // Cada período lleva a su cierre (Etapa 6A): el rango es el enlace.
  const enlace = (p: Periodo, clase = "") => {
    const rango = rangoPeriodo(p.inicio, p.fin, i18n.language);
    return (
      <Link
        to={`/presupuesto/${p.id}`}
        aria-label={t("presupuesto.verCierre", { rango })}
        className={`text-title text-primary underline-offset-4 hover:underline ${clase}`}
      >
        {rango}
      </Link>
    );
  };
  // Sin ingresos al presupuesto no hay % de uso (decisión 4).
  const barra = (p: Periodo, conDetalle: boolean) =>
    p.presupuesto > 0 ? (
      <BarraPresupuesto usado={p.usado} base={p.presupuesto} conDetalle={conDetalle} />
    ) : (
      <span className="text-body-sm text-muted-foreground">
        {t("presupuesto.sinPresupuesto", { gastado: formatearPesos(p.usado) })}
      </span>
    );
  const detalle = (p: Periodo) => (
    <>
      {p.ingresosPresupuesto > 0 && (
        <span className="block text-body-sm text-muted-foreground">
          {t("presupuesto.conIngresos", {
            salario: formatearPesos(p.salarioPresupuesto),
            ingresos: formatearPesos(p.ingresosPresupuesto),
          })}
        </span>
      )}
    </>
  );

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("presupuesto.columnas.periodo")}</TableHead>
              <TableHead className="text-right">{t("presupuesto.columnas.presupuesto")}</TableHead>
              <TableHead className="text-right">{t("presupuesto.columnas.gastado")}</TableHead>
              <TableHead className="w-1/4">{t("presupuesto.columnas.uso")}</TableHead>
              <TableHead>{t("presupuesto.columnas.estado")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {enlace(p, "whitespace-nowrap")}
                  {detalle(p)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearPesos(p.presupuesto)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearPesos(p.usado)}
                </TableCell>
                <TableCell>{barra(p, false)}</TableCell>
                <TableCell>{insignia(p)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {periodos.map((p) => (
        <li key={p.id} className="flex flex-col gap-sm rounded-card border bg-card p-md">
          <div className="flex flex-wrap items-start justify-between gap-sm">
            <div className="flex min-w-0 flex-col">
              {enlace(p)}
              {detalle(p)}
            </div>
            {insignia(p)}
          </div>
          {barra(p, true)}
        </li>
      ))}
    </ul>
  );
}

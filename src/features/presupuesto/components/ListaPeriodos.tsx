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
                  <span className="text-title">{rangoPeriodo(p.inicio, p.fin, i18n.language)}</span>
                  {detalle(p)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearPesos(p.presupuesto)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearPesos(p.usado)}
                </TableCell>
                <TableCell>
                  <BarraPresupuesto usado={p.usado} base={p.presupuesto} conDetalle={false} />
                </TableCell>
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
              <span className="text-title">{rangoPeriodo(p.inicio, p.fin, i18n.language)}</span>
              {detalle(p)}
            </div>
            {insignia(p)}
          </div>
          <BarraPresupuesto usado={p.usado} base={p.presupuesto} />
        </li>
      ))}
    </ul>
  );
}

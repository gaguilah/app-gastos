import type { ReactNode } from "react";
import { ArrowLeftRight, History, Pencil, PlusCircle, Scale, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MenuAcciones, type Accion } from "@/components/shared/MenuAcciones";
import type { Bolsa } from "@/datos/bolsas";
import { useEsComputador } from "@/lib/useEsComputador";
import { ultimoMovimiento } from "../textos";
import { SaldoBolsa } from "./SaldoBolsa";

export type AccionBolsa =
  "movimientos" | "recargar" | "trasladar" | "ajustar" | "renombrar" | "eliminar";

type Props = {
  bolsas: Bolsa[];
  hoy: string;
  alElegir: (accion: AccionBolsa, bolsa: Bolsa) => void;
};

/** Tabla en computador y tarjetas en móvil y tablet (DESIGN.md §3), cada una con su menú ⋮. */
export function ListaBolsas({ bolsas, hoy, alElegir }: Props) {
  const { t, i18n } = useTranslation();
  const esComputador = useEsComputador();

  const menu = (b: Bolsa) => {
    const accion = (clave: AccionBolsa, icono: ReactNode): Accion => ({
      clave,
      etiqueta: t(`bolsas.acciones.${clave}`),
      icono,
      alElegir: () => alElegir(clave, b),
    });
    const acciones: Accion[] = [
      accion("movimientos", <History aria-hidden="true" />),
      accion("recargar", <PlusCircle aria-hidden="true" />),
      {
        ...accion("trasladar", <ArrowLeftRight aria-hidden="true" />),
        deshabilitada: bolsas.length < 2 ? t("bolsas.recargar.sinOtras") : undefined,
      },
      accion("ajustar", <Scale aria-hidden="true" />),
      accion("renombrar", <Pencil aria-hidden="true" />),
      {
        ...accion("eliminar", <Trash2 aria-hidden="true" />),
        destructiva: true,
        deshabilitada: b.enUsoPorReglas ? t("bolsas.acciones.enUso") : undefined,
      },
    ];
    return (
      <MenuAcciones
        titulo={b.nombre}
        etiqueta={t("comun.acciones", { nombre: b.nombre })}
        acciones={acciones}
      />
    );
  };

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("bolsas.columnas.bolsa")}</TableHead>
              <TableHead>{t("bolsas.columnas.ultimo")}</TableHead>
              <TableHead className="text-right">{t("bolsas.columnas.movimientos")}</TableHead>
              <TableHead className="text-right">{t("bolsas.columnas.saldo")}</TableHead>
              <TableHead className="w-touch">
                <span className="sr-only">{t("bolsas.columnas.acciones")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bolsas.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-title">{b.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ultimoMovimiento(b, hoy, t, i18n.language)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{b.usos}</TableCell>
                <TableCell className="text-right">
                  <SaldoBolsa saldo={b.saldo} />
                </TableCell>
                <TableCell>{menu(b)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {bolsas.map((b) => (
        <li key={b.id} className="flex items-center gap-sm rounded-card border bg-card p-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <span className="text-title">{b.nombre}</span>
            <span className="text-body-sm text-muted-foreground">
              {ultimoMovimiento(b, hoy, t, i18n.language)}
            </span>
            {b.usos > 0 && (
              <span className="text-body-sm text-muted-foreground">
                {t("bolsas.movimientos", { count: b.usos })}
              </span>
            )}
          </div>
          <SaldoBolsa saldo={b.saldo} className="text-amount-kpi" />
          {menu(b)}
        </li>
      ))}
    </ul>
  );
}

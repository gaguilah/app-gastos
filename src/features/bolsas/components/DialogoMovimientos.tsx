import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EstadoCarga } from "@/components/shared/Estado";
import { Ventana } from "@/components/shared/Ventana";
import { useMovimientosBolsa, useSaldosAl, type Bolsa, type Movimiento } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { fechaPorPlazo } from "@/dominio/fechas";
import { cn } from "@/lib/utils";
import { detalleMovimiento, fechaVisible, tituloMovimiento } from "../textos";
import { SaldoBolsa } from "./SaldoBolsa";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  bolsa: Bolsa;
  hoy: string;
  /** Inicio del período en curso, si hubo uno antes: marca dónde va «Viene del período anterior». */
  inicioPeriodo?: string;
};

/**
 * Gastos, ingresos, recargas, traslados, ajustes, aportes, retiros y sobrantes con signo
 * (supuesto 7). Antes de los del período en curso, el saldo con que llegó (Etapa 6A, S6).
 */
export function DialogoMovimientos({ abierta, alCambiar, bolsa, hoy, inicioPeriodo }: Props) {
  const { t, i18n } = useTranslation();
  const consulta = useMovimientosBolsa(bolsa.id);
  // El saldo al final del día anterior al período: se recalcula solo con un gasto atrasado.
  const saldosAnteriores = useSaldosAl(inicioPeriodo && fechaPorPlazo(inicioPeriodo, -1, "dias"));
  const viene = saldosAnteriores.data?.get(bolsa.id) ?? (saldosAnteriores.data ? 0 : null);
  const movimientos = consulta.data ?? [];
  const delPeriodo = inicioPeriodo ? movimientos.filter((m) => m.fecha >= inicioPeriodo) : [];
  const anteriores = movimientos.slice(delPeriodo.length);

  const fila = (m: Movimiento) => {
    const detalle = detalleMovimiento(m, t);
    const fecha = fechaVisible(m.fecha, hoy, t, i18n.language);
    return (
      <li
        key={`${m.tipo}-${m.id}`}
        className="flex items-center justify-between gap-md border-t py-sm first:border-t-0"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-body-md font-medium">{tituloMovimiento(m, t)}</span>
          <span className="text-body-sm text-muted-foreground">
            {detalle ? `${fecha} · ${detalle}` : fecha}
          </span>
        </span>
        <Monto valor={m.valor} />
      </li>
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.movimiento.titulo", { nombre: bolsa.nombre })}
      formulario
      pie={
        <Button variant="secondary" onClick={() => alCambiar(false)}>
          {t("comun.cerrar")}
        </Button>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        <div className="flex items-center justify-between gap-md rounded-card bg-muted p-md">
          <span className="text-body-md text-muted-foreground">{t("bolsas.movimiento.saldo")}</span>
          <SaldoBolsa saldo={bolsa.saldo} className="text-amount-kpi" />
        </div>
        {consulta.isPending ? (
          <EstadoCarga filas={3} />
        ) : consulta.isError ? (
          <p role="alert" className="text-body-md text-destructive">
            {t("bolsas.movimiento.error")}
          </p>
        ) : movimientos.length === 0 && viene === null ? (
          <p className="text-body-md text-muted-foreground">{t("bolsas.movimiento.vacio")}</p>
        ) : (
          <ul className="flex flex-col">
            {delPeriodo.map(fila)}
            {viene !== null && (
              <li className="flex items-center justify-between gap-md border-t bg-muted px-sm py-sm first:border-t-0 rounded-control">
                <span className="text-body-md font-medium">
                  {t("bolsas.movimiento.vieneAnterior")}
                </span>
                <span className="font-mono text-label-numeric tabular-nums">
                  {formatearPesos(viene)}
                </span>
              </li>
            )}
            {anteriores.map(fila)}
          </ul>
        )}
      </div>
    </Ventana>
  );
}

function Monto({ valor }: { valor: number }) {
  return (
    <span className={cn("font-mono text-label-numeric tabular-nums", valor > 0 && "text-success")}>
      {formatearPesos(valor, { signo: true })}
    </span>
  );
}

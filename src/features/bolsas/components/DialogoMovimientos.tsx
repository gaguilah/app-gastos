import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EstadoCarga } from "@/components/shared/Estado";
import { Ventana } from "@/components/shared/Ventana";
import { useMovimientosBolsa, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";
import { detalleMovimiento, fechaVisible, tituloMovimiento } from "../textos";
import { SaldoBolsa } from "./SaldoBolsa";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; bolsa: Bolsa; hoy: string };

/** Gastos, ingresos, recargas, traslados, ajustes, aportes y retiros con signo (supuesto 7). */
export function DialogoMovimientos({ abierta, alCambiar, bolsa, hoy }: Props) {
  const { t, i18n } = useTranslation();
  const consulta = useMovimientosBolsa(bolsa.id);

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
        ) : consulta.data.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t("bolsas.movimiento.vacio")}</p>
        ) : (
          <ul className="flex flex-col">
            {consulta.data.map((m) => {
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
                  <span
                    className={cn(
                      "font-mono text-label-numeric tabular-nums",
                      m.valor > 0 && "text-success",
                    )}
                  >
                    {formatearPesos(m.valor, { signo: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Ventana>
  );
}

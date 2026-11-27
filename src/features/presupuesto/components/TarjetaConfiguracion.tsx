import { Banknote, CalendarDays, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatearPesos } from "@/dominio/dinero";

type Props = {
  diaInicio: number;
  salarioBase: number;
  presupuestoSalarioBase: number;
  alCambiarDia: () => void;
  alCambiarSalario: () => void;
};

const fila = "flex flex-wrap items-center gap-md border-t py-md first:border-t-0 first:pt-0";

function Fila(props: {
  Icono: LucideIcon;
  etiqueta: string;
  valor: ReactNode;
  accion: string;
  alPulsar: () => void;
}) {
  return (
    <div className={fila}>
      <props.Icono className="size-icono text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <span className="text-body-sm text-muted-foreground">{props.etiqueta}</span>
        <span className="text-title">{props.valor}</span>
      </div>
      <Button variant="secondary" className="w-full @md:w-auto" onClick={props.alPulsar}>
        {props.accion}
      </Button>
    </div>
  );
}

/** Salario base (decisión 2) y día de inicio (3.1), cada uno con su botón de cambio. */
export function TarjetaConfiguracion({
  diaInicio,
  salarioBase,
  presupuestoSalarioBase,
  alCambiarDia,
  alCambiarSalario,
}: Props) {
  const { t } = useTranslation();
  const configurado = salarioBase > 0;
  return (
    <section
      aria-labelledby="titulo-configuracion"
      className="@container flex flex-col gap-md rounded-card border bg-card p-md xl:p-lg"
    >
      <h2 id="titulo-configuracion" className="text-headline-sm">
        {t("presupuesto.configuracion")}
      </h2>
      <div className="flex flex-col">
        <Fila
          Icono={Banknote}
          etiqueta={t("presupuesto.salario.titulo")}
          valor={
            configurado ? (
              <>
                <span className="font-mono tabular-nums">{formatearPesos(salarioBase)}</span>
                <span className="block text-body-sm font-normal text-muted-foreground">
                  {t("presupuesto.salario.resumen", {
                    presupuesto: formatearPesos(presupuestoSalarioBase),
                  })}
                </span>
              </>
            ) : (
              <span className="text-body-md font-normal text-muted-foreground">
                {t("presupuesto.salario.sinConfigurar")}
              </span>
            )
          }
          accion={t(configurado ? "presupuesto.salario.cambiar" : "presupuesto.salario.configurar")}
          alPulsar={alCambiarSalario}
        />
        <Fila
          Icono={CalendarDays}
          etiqueta={t("presupuesto.diaInicio")}
          valor={
            diaInicio === 1
              ? t("presupuesto.diaInicioUno")
              : t("presupuesto.diaInicioOtro", { dia: diaInicio, anterior: diaInicio - 1 })
          }
          accion={t("presupuesto.cambiarDia")}
          alPulsar={alCambiarDia}
        />
      </div>
    </section>
  );
}

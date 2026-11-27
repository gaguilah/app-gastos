import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type Props = {
  diaInicio: number;
  alCambiarDia: () => void;
};

const fila = "flex flex-wrap items-center gap-md border-t py-md first:border-t-0 first:pt-0";

/** Día de inicio con su botón de cambio (3.1). */
export function TarjetaConfiguracion({ diaInicio, alCambiarDia }: Props) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="titulo-configuracion"
      className="flex flex-col gap-md rounded-card border bg-card p-md xl:p-lg"
    >
      <h2 id="titulo-configuracion" className="text-headline-sm">
        {t("presupuesto.configuracion")}
      </h2>
      <div className="flex flex-col">
        <div className={fila}>
          <CalendarDays className="size-icono text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <span className="text-body-sm text-muted-foreground">{t("presupuesto.diaInicio")}</span>
            <span className="text-title">
              {diaInicio === 1
                ? t("presupuesto.diaInicioUno")
                : t("presupuesto.diaInicioOtro", { dia: diaInicio, anterior: diaInicio - 1 })}
            </span>
          </div>
          <Button variant="secondary" className="w-full md:w-auto" onClick={alCambiarDia}>
            {t("presupuesto.cambiarDia")}
          </Button>
        </div>
      </div>
    </section>
  );
}

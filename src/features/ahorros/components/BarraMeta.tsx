import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { formatearPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";
import { avanceMeta } from "../textos";

type Props = { saldo: number; monto: number; ideal?: number; className?: string };

/**
 * Avance de la meta con el porcentaje escrito; con `ideal`, una marca del ritmo ideal a hoy
 * (supuesto 27: sin gráfica hasta la Etapa 11).
 */
export function BarraMeta({ saldo, monto, ideal, className }: Props) {
  const { t } = useTranslation();
  const porcentaje = avanceMeta(saldo, monto);
  const marca = ideal === undefined ? null : Math.min(avanceMeta(ideal, monto), 100);
  return (
    <div className={cn("flex items-center gap-sm", className)}>
      <div className="relative flex-1">
        <Progress
          value={Math.min(porcentaje, 100)}
          aria-label={
            ideal === undefined
              ? t("ahorros.avance", { saldo: formatearPesos(saldo), monto: formatearPesos(monto) })
              : t("ahorros.detalle.barra", {
                  saldo: formatearPesos(saldo),
                  ideal: formatearPesos(ideal),
                })
          }
          aria-valuetext={t("presupuesto.barra.porcentaje", { porcentaje })}
        />
        {marca !== null && (
          <span
            aria-hidden="true"
            className="absolute -top-xs -bottom-xs w-xs -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${marca}%` }}
          />
        )}
      </div>
      <span className="font-mono text-label-numeric text-muted-foreground">
        {t("presupuesto.barra.porcentaje", { porcentaje })}
      </span>
    </div>
  );
}

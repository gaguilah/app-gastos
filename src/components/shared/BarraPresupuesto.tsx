import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { formatearPesos, porcentajeUsado, umbralAlerta, type UmbralAlerta } from "@/dominio/dinero";
import { cn } from "@/lib/utils";

// Clases completas para que Tailwind las encuentre (DESIGN.md §2.1, tokens alerta-*).
const relleno: Record<UmbralAlerta, string> = {
  "70": "bg-alerta-70",
  "75": "bg-alerta-75",
  "80": "bg-alerta-80",
  "85": "bg-alerta-85",
  "90": "bg-alerta-90",
  "95": "bg-alerta-95",
  "100": "bg-alerta-100",
  superado: "bg-alerta-superado",
};
const texto: Record<UmbralAlerta, string> = {
  "70": "text-alerta-70",
  "75": "text-alerta-75",
  "80": "text-alerta-80",
  "85": "text-alerta-85",
  "90": "text-alerta-90",
  "95": "text-alerta-95",
  "100": "text-alerta-100",
  superado: "text-alerta-superado",
};

type Props = {
  /** Lo usado del período: base − disponible (gastos y aportes que afectan el presupuesto). */
  usado: number;
  /** Presupuesto + ingresos al presupuesto, como en las alertas (3.2). */
  base: number;
  /** Muestra «Gastado $X de $Y» debajo de la barra. */
  conDetalle?: boolean;
  className?: string;
};

/** Barra de presupuesto con el porcentaje escrito (DESIGN.md §4): nunca solo color. */
export function BarraPresupuesto({ usado, base, conDetalle = true, className }: Props) {
  const { t } = useTranslation();
  const porcentaje = porcentajeUsado(usado, base);
  const umbral = umbralAlerta(porcentaje);
  const etiqueta = t("presupuesto.barra.etiqueta", {
    usado: formatearPesos(usado),
    base: formatearPesos(base),
  });

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <div className="flex items-center gap-sm">
        <Progress
          value={porcentaje}
          aria-label={etiqueta}
          aria-valuetext={t("presupuesto.barra.porcentaje", { porcentaje })}
          indicador={umbral ? relleno[umbral] : undefined}
          className="flex-1"
        />
        <span
          className={cn(
            "font-mono text-label-numeric",
            umbral ? texto[umbral] : "text-muted-foreground",
          )}
        >
          {t("presupuesto.barra.porcentaje", { porcentaje })}
        </span>
      </div>
      {conDetalle && <p className="text-body-sm text-muted-foreground">{etiqueta}</p>}
    </div>
  );
}

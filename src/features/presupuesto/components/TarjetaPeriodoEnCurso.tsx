import { CalendarClock } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BarraPresupuesto } from "@/components/shared/BarraPresupuesto";
import type { Periodo } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";
import { rangoPeriodo } from "@/dominio/fechas";
import { cn } from "@/lib/utils";

type Props = { periodo: Periodo; hoy: string };

/**
 * Período en curso con el desglose (Etapa 6A, decisión 4): presupuesto = parte del salario +
 * ingresos que suman; sin ingresos invita a registrar uno. El último día, la franja de S10.
 */
export function TarjetaPeriodoEnCurso({ periodo: p, hoy }: Props) {
  const { t, i18n } = useTranslation();
  const filas: [string, number, string?][] = [
    [t("presupuesto.enCurso.salarioPresupuesto"), p.salarioPresupuesto],
    [t("presupuesto.enCurso.ingresos"), p.ingresosPresupuesto],
    [t("presupuesto.enCurso.presupuesto"), p.presupuesto, "border-t pt-sm text-title"],
    [t("presupuesto.enCurso.gastado"), p.usado],
    [
      t("presupuesto.enCurso.disponible"),
      p.disponible,
      cn("text-title", p.disponible < 0 && "text-destructive"),
    ],
  ];

  return (
    <section
      aria-labelledby="titulo-en-curso"
      className="flex flex-col gap-md rounded-card border bg-card p-md xl:p-lg"
    >
      <header className="flex flex-col gap-xs">
        <h2 id="titulo-en-curso" className="text-headline-sm">
          {t("presupuesto.enCurso.titulo")}
        </h2>
        <p className="text-body-sm text-muted-foreground">
          {rangoPeriodo(p.inicio, p.fin, i18n.language)}
          {p.salario > 0 &&
            ` · ${t("presupuesto.enCurso.salario", { salario: formatearPesos(p.salario) })}`}
        </p>
      </header>

      {hoy === p.fin && (
        <Alert variant="warning" role="status">
          <CalendarClock aria-hidden="true" />
          <span>{t("presupuesto.ultimoDia")}</span>
        </Alert>
      )}

      {p.presupuesto > 0 ? (
        <>
          <dl className="flex flex-col gap-sm">
            {filas.map(([etiqueta, valor, clase]) => (
              <div
                key={etiqueta}
                className={cn("flex items-baseline justify-between gap-md text-body-md", clase)}
              >
                <dt>{etiqueta}</dt>
                <dd className="font-mono tabular-nums">{formatearPesos(valor)}</dd>
              </div>
            ))}
          </dl>
          <BarraPresupuesto usado={p.usado} base={p.presupuesto} conDetalle={false} />
        </>
      ) : (
        <div className="flex flex-col items-start gap-sm">
          <p className="text-body-md">{t("presupuesto.sinIngresos.titulo")}</p>
          <p className="text-body-sm text-muted-foreground">
            {t("presupuesto.sinIngresos.mensaje", { gastado: formatearPesos(p.usado) })}
          </p>
          <Button asChild>
            <Link to="/ingresos?nuevo=1">{t("presupuesto.sinIngresos.accion")}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

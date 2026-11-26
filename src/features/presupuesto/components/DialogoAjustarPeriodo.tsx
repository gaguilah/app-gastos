import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useAjustarPeriodo, type Periodo } from "@/datos/presupuesto";
import { formatearPesos, porcentajeUsado } from "@/dominio/dinero";
import { rangoPeriodo } from "@/dominio/fechas";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  periodo: Periodo;
};

/** Sube o baja el presupuesto del período en curso, con motivo (supuesto 10). */
export function DialogoAjustarPeriodo({ abierta, alCambiar, periodo }: Props) {
  const { t, i18n } = useTranslation();
  const ajustar = useAjustarPeriodo();
  const [ajuste, setAjuste] = useState<number | null>(null);
  const [motivo, setMotivo] = useState(periodo.nota ?? "");
  const [intento, setIntento] = useState(false);

  const conAjuste = periodo.presupuesto + (ajuste ?? 0);
  const negativo = conAjuste < 0;
  const vacio = ajuste === null || ajuste === 0;
  const error = negativo
    ? t("presupuesto.ajuste.negativo")
    : intento && vacio
      ? t("presupuesto.ajuste.requerido")
      : null;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (vacio || negativo) return;
    ajustar.mutate(
      { periodoId: periodo.id, ajuste, nota: motivo.trim() },
      {
        onSuccess: () => {
          toast.success(t("presupuesto.guardado"));
          alCambiar(false);
        },
      },
    );
  };

  const filas = [
    ["base", periodo.presupuesto],
    ["conAjuste", conAjuste],
    ["gastado", periodo.usado],
  ] as const;

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("presupuesto.ajuste.titulo", {
        rango: rangoPeriodo(periodo.inicio, periodo.fin, i18n.language),
      })}
      descripcion={t("presupuesto.ajuste.soloEste")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-ajuste" disabled={ajustar.isPending}>
            {ajustar.isPending ? t("comun.guardando") : t("presupuesto.ajuste.aplicar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-ajuste"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("presupuesto.ajuste.valor")}
          negativo
          autoFocus
          valor={ajuste}
          alCambiar={(v) => {
            setAjuste(v);
            setIntento(false);
            ajustar.reset();
          }}
          ayuda={t("presupuesto.ajuste.ayudaValor")}
          error={error}
        />
        <Campo
          etiqueta={t("presupuesto.ajuste.motivo")}
          autoComplete="off"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <dl className="flex flex-col rounded-card border">
          {filas.map(([clave, valor]) => (
            <div
              key={clave}
              className="flex items-center justify-between gap-md border-t px-md py-sm first:border-t-0"
            >
              <dt className="text-body-sm text-muted-foreground">
                {t(`presupuesto.ajuste.${clave}`)}
              </dt>
              <dd className="font-mono text-label-numeric tabular-nums">{formatearPesos(valor)}</dd>
            </div>
          ))}
        </dl>
        {!vacio && !negativo && (
          <p role="status" className="flex gap-xs text-body-sm text-muted-foreground">
            <Info className="mt-xs size-icono-sm shrink-0" aria-hidden="true" />
            {t("presupuesto.ajuste.quedarias", {
              nuevo: porcentajeUsado(periodo.usado, periodo.base + ajuste),
              actual: porcentajeUsado(periodo.usado, periodo.base),
            })}
          </p>
        )}
        <AvisoError error={ajustar.error} />
      </form>
    </Ventana>
  );
}

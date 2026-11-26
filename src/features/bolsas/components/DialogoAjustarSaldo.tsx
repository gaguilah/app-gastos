import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useAjustarSaldo, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { SaldoBolsa } from "./SaldoBolsa";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; bolsa: Bolsa };

/**
 * Ajuste de saldo (3.4): hacia abajo queda un «Gasto desconocido» que baja el disponible;
 * hacia arriba, un ajuste de entrada que no lo toca.
 */
export function DialogoAjustarSaldo({ abierta, alCambiar, bolsa }: Props) {
  const { t } = useTranslation();
  const ajustar = useAjustarSaldo();
  const [real, setReal] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const diferencia = real === null ? null : real - bolsa.saldo;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (real === null) return;
    if (diferencia === 0) {
      alCambiar(false);
      return;
    }
    ajustar.mutate(
      { id: bolsa.id, saldoReal: real },
      {
        onSuccess: () => {
          toast.success(t("bolsas.avisos.ajustada"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.ajustar.titulo", { nombre: bolsa.nombre })}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-ajuste-saldo" disabled={ajustar.isPending}>
            {ajustar.isPending ? t("comun.guardando") : t("bolsas.ajustar.ajustar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-ajuste-saldo"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <div className="flex items-center justify-between gap-md rounded-card bg-muted p-md">
          <span className="text-body-md text-muted-foreground">{t("bolsas.ajustar.enApp")}</span>
          <SaldoBolsa saldo={bolsa.saldo} className="text-amount-kpi" />
        </div>
        <CampoMonto
          etiqueta={t("bolsas.ajustar.real")}
          valor={real}
          autoFocus
          alCambiar={(v) => {
            setReal(v);
            setIntento(false);
            ajustar.reset();
          }}
          ayuda={t("bolsas.ajustar.ayudaReal", { nombre: bolsa.nombre })}
          error={intento && real === null ? t("bolsas.ajustar.requerido") : null}
        />
        {diferencia !== null && (
          <p role="status" className="flex gap-xs text-body-sm text-muted-foreground">
            <Info className="mt-xs size-icono-sm shrink-0" aria-hidden="true" />
            {diferencia === 0
              ? t("bolsas.ajustar.igual")
              : t(diferencia < 0 ? "bolsas.ajustar.baja" : "bolsas.ajustar.sube", {
                  diferencia: formatearPesos(diferencia, { signo: true }),
                  valor: formatearPesos(-diferencia),
                })}
          </p>
        )}
        <AvisoError error={ajustar.error} />
      </form>
    </Ventana>
  );
}

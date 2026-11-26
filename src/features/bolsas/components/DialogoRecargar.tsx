import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { Ventana } from "@/components/shared/Ventana";
import { useRecargarBolsa, useTrasladar, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { OpcionRadio } from "./OpcionRadio";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  bolsa: Bolsa;
  /** Hay otra bolsa de la que pueda salir el dinero. */
  hayOtras: boolean;
};

type Origen = "cuenta" | "bolsa" | "ingreso";

/**
 * Recarga (3.4). Nunca toca el presupuesto (supuesto 1): de mi cuenta solo suma a la bolsa,
 * de otra bolsa es un traslado e «Ingreso nuevo» lleva al formulario de ingreso.
 */
export function DialogoRecargar({ abierta, alCambiar, bolsa, hayOtras }: Props) {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const recargar = useRecargarBolsa();
  const trasladar = useTrasladar();
  const [origen, setOrigen] = useState<Origen>("cuenta");
  const [desde, setDesde] = useState<string | null>(null);
  const [valor, setValor] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const mutacion = origen === "bolsa" ? trasladar : recargar;
  const valido = valor !== null && valor > 0;

  const listo = () => {
    toast.success(t(origen === "bolsa" ? "bolsas.avisos.trasladado" : "bolsas.avisos.recargada"));
    alCambiar(false);
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (origen === "ingreso") {
      void navegar(`/ingresos?nuevo=1&destino=${bolsa.id}`);
      return;
    }
    setIntento(true);
    if (!valido || (origen === "bolsa" && !desde)) return;
    if (origen === "bolsa") {
      trasladar.mutate({ origen: desde!, destino: bolsa.id, valor }, { onSuccess: listo });
    } else {
      recargar.mutate({ id: bolsa.id, valor }, { onSuccess: listo });
    }
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.recargar.titulo", { nombre: bolsa.nombre })}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-recarga" disabled={mutacion.isPending}>
            {mutacion.isPending
              ? t("comun.guardando")
              : t(origen === "ingreso" ? "bolsas.recargar.irAIngreso" : "bolsas.recargar.recargar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-recarga"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <fieldset className="flex flex-col gap-xs">
          <Label asChild>
            <legend className="mb-xs">{t("bolsas.recargar.deDonde")}</legend>
          </Label>
          <RadioGroup
            value={origen}
            onValueChange={(v) => {
              setOrigen(v as Origen);
              setIntento(false);
              recargar.reset();
              trasladar.reset();
            }}
          >
            <OpcionRadio valor="cuenta" ayuda={t("bolsas.recargar.deMiCuentaAyuda")}>
              {t("bolsas.recargar.deMiCuenta")}
            </OpcionRadio>
            {hayOtras && (
              <OpcionRadio valor="bolsa">{t("bolsas.recargar.deOtraBolsa")}</OpcionRadio>
            )}
            <OpcionRadio
              valor="ingreso"
              ayuda={t("bolsas.recargar.ingresoNuevoAyuda", { nombre: bolsa.nombre })}
            >
              {t("bolsas.recargar.ingresoNuevo")}
            </OpcionRadio>
          </RadioGroup>
        </fieldset>

        {origen !== "ingreso" && (
          <>
            <CampoMonto
              etiqueta={t("bolsas.recargar.valor")}
              valor={valor}
              alCambiar={(v) => {
                setValor(v);
                mutacion.reset();
              }}
              error={intento && !valido ? t("bolsas.recargar.requerido") : null}
            />
            {origen === "bolsa" && (
              <SelectorBolsa
                etiqueta={t("bolsas.recargar.origen")}
                valor={desde}
                alCambiar={setDesde}
                excluir={[bolsa.id]}
                salida={valor}
                error={intento && !desde ? t("bolsas.recargar.elegirOrigen") : null}
              />
            )}
            {valido && (
              <p role="status" className="text-body-sm text-muted-foreground">
                {t("bolsas.recargar.resumen", {
                  nombre: bolsa.nombre,
                  saldo: formatearPesos(bolsa.saldo + valor),
                })}
              </p>
            )}
          </>
        )}
        <AvisoError error={mutacion.error} />
      </form>
    </Ventana>
  );
}

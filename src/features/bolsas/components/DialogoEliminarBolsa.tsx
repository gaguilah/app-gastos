import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { useEliminarBolsa, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { OpcionRadio } from "./OpcionRadio";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  bolsa: Bolsa;
  /** Las demás bolsas activas: destinos posibles del saldo. */
  otras: Bolsa[];
};

const AJUSTE = "ajuste";

/** Elimina o archiva la bolsa; el saldo pasa a otra bolsa o queda como ajuste (supuesto 5). */
export function DialogoEliminarBolsa({ abierta, alCambiar, bolsa, otras }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarBolsa();
  const conSaldo = bolsa.saldo !== 0;
  const [destino, setDestino] = useState(otras[0]?.id ?? AJUSTE);
  const saldo = formatearPesos(bolsa.saldo);

  const confirmar = () =>
    eliminar.mutate(
      { id: bolsa.id, destino: conSaldo && destino !== AJUSTE ? destino : null },
      {
        onSuccess: (resultado) => {
          toast.success(
            t(resultado === "archivado" ? "bolsas.avisos.archivada" : "bolsas.avisos.eliminada"),
          );
          alCambiar(false);
        },
      },
    );

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("bolsas.eliminar.titulo", { nombre: bolsa.nombre })}
      descripcion={
        bolsa.usos > 0
          ? t("bolsas.eliminar.conMovimientos", { count: bolsa.usos, nombre: bolsa.nombre })
          : t("bolsas.eliminar.sinMovimientos")
      }
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("bolsas.eliminar.eliminar")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        {conSaldo && (
          <fieldset className="flex flex-col gap-xs">
            <Label asChild>
              <legend className="mb-xs">{t("bolsas.eliminar.queHacer", { saldo })}</legend>
            </Label>
            <RadioGroup value={destino} onValueChange={setDestino}>
              {otras.map((o) => (
                <OpcionRadio key={o.id} valor={o.id}>
                  {t("bolsas.eliminar.pasarA", { nombre: o.nombre })}
                </OpcionRadio>
              ))}
              <OpcionRadio
                valor={AJUSTE}
                ayuda={
                  bolsa.saldo > 0
                    ? t("bolsas.eliminar.ajustePositivo", { saldo })
                    : t("bolsas.eliminar.ajusteNegativo")
                }
              >
                {t("bolsas.eliminar.dejarAjuste")}
              </OpcionRadio>
            </RadioGroup>
          </fieldset>
        )}
        <AvisoError error={eliminar.error} />
      </div>
    </Ventana>
  );
}

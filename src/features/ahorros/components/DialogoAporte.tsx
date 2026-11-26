import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useAportarMeta, useMedios, type Meta } from "@/datos/ahorros";
import { useBolsas } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { avanceMeta, leerOrigen } from "../textos";
import { SelectorOrigen } from "./SelectorOrigen";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; meta: Meta };

/** Aporte manual (supuesto 22): desde una bolsa nunca afecta; desde un medio, con la casilla. */
export function DialogoAporte({ abierta, alCambiar, meta }: Props) {
  const { t } = useTranslation();
  const aportar = useAportarMeta();
  const { data: bolsas } = useBolsas();
  const { data: medios } = useMedios();
  const [valor, setValor] = useState<number | null>(null);
  const [origen, setOrigen] = useState<string | null>(null);
  const [afecta, setAfecta] = useState(false);
  const [intento, setIntento] = useState(false);
  const leido = leerOrigen(origen, afecta);
  const nombreOrigen = leido?.bolsaId
    ? bolsas?.find((b) => b.id === leido.bolsaId)?.nombre
    : medios?.find((m) => m.id === leido?.medioId)?.nombre;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valor || !leido) return;
    aportar.mutate(
      { metaId: meta.id, valor, ...leido },
      {
        onSuccess: () => {
          toast.success(t("ahorros.avisos.aporte"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("ahorros.aporte.titulo", { nombre: meta.nombre })}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-aporte" disabled={aportar.isPending}>
            {aportar.isPending ? t("comun.guardando") : t("ahorros.aporte.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-aporte"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("ahorros.aporte.valor")}
          valor={valor}
          autoFocus
          alCambiar={(v) => {
            setValor(v);
            aportar.reset();
          }}
          error={intento && !valor ? t("ahorros.formulario.valorRequerido") : null}
        />
        <SelectorOrigen
          etiqueta={t("ahorros.aporte.desde")}
          valor={origen}
          alCambiar={setOrigen}
          afecta={afecta}
          alCambiarAfecta={setAfecta}
          salida={valor}
          error={intento && !origen ? t("ahorros.formulario.origenRequerido") : null}
        />
        {valor && leido && nombreOrigen && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {[
              leido.bolsaId
                ? t("ahorros.aporte.desdeBolsa", { origen: nombreOrigen })
                : `${t("ahorros.aporte.desdeMedio", { origen: nombreOrigen })} ${t(
                    afecta ? "ahorros.aporte.bajaDisponible" : "ahorros.aporte.noBaja",
                  )}`,
              t("ahorros.aporte.quedarias", {
                saldo: formatearPesos(meta.saldo + valor),
                porcentaje: avanceMeta(meta.saldo + valor, meta.monto),
              }),
            ].join(" ")}
          </p>
        )}
        <AvisoError error={aportar.error} />
      </form>
    </Ventana>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { Ventana } from "@/components/shared/Ventana";
import { useTrasladar, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  bolsa: Bolsa;
  bolsas: Bolsa[];
};

/** Traslado entre bolsas (supuesto 2): no es gasto ni ingreso y no toca el presupuesto. */
export function DialogoTrasladar({ abierta, alCambiar, bolsa, bolsas }: Props) {
  const { t } = useTranslation();
  const trasladar = useTrasladar();
  const [destino, setDestino] = useState<string | null>(null);
  const [valor, setValor] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const valido = valor !== null && valor > 0;
  const elegida = bolsas.find((b) => b.id === destino);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valido || !destino) return;
    trasladar.mutate(
      { origen: bolsa.id, destino, valor },
      {
        onSuccess: () => {
          toast.success(t("bolsas.avisos.trasladado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.trasladar.titulo", { nombre: bolsa.nombre })}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-traslado" disabled={trasladar.isPending}>
            {trasladar.isPending ? t("comun.guardando") : t("bolsas.trasladar.trasladar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-traslado"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("bolsas.recargar.valor")}
          valor={valor}
          autoFocus
          alCambiar={(v) => {
            setValor(v);
            trasladar.reset();
          }}
          error={intento && !valido ? t("bolsas.recargar.requerido") : null}
        />
        <SelectorBolsa
          etiqueta={t("bolsas.trasladar.destino")}
          valor={destino}
          alCambiar={setDestino}
          excluir={[bolsa.id]}
          error={intento && !destino ? t("bolsas.trasladar.elegirDestino") : null}
        />
        {valido && elegida && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {t("bolsas.trasladar.resumen", {
              origen: bolsa.nombre,
              saldoOrigen: formatearPesos(bolsa.saldo - valor),
              destino: elegida.nombre,
              saldoDestino: formatearPesos(elegida.saldo + valor),
            })}
          </p>
        )}
        <AvisoError error={trasladar.error} />
      </form>
    </Ventana>
  );
}

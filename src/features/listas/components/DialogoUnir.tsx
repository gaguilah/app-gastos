import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ventana } from "@/components/shared/Ventana";
import { useMarcarDistintos, useUnir, type Elemento, type Lista } from "@/datos/listas";
import { nombreVisible } from "../textos";
import { AvisoError } from "./AvisoError";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  lista: Lista;
  origen: Elemento;
  candidatos: Elemento[];
  destinoInicial?: string;
  /** Abierto desde «Posible duplicado»: ofrece «No son el mismo». */
  desdeDuplicado?: boolean;
};

/** Une dos registros del mismo tipo en una sola transacción de la base de datos (3.14). */
export function DialogoUnir({
  abierta,
  alCambiar,
  lista,
  origen,
  candidatos,
  destinoInicial,
  desdeDuplicado = false,
}: Props) {
  const { t } = useTranslation();
  const unir = useUnir();
  const distintos = useMarcarDistintos();
  const [destinoId, setDestinoId] = useState(destinoInicial ?? "");
  const destino = candidatos.find((c) => c.id === destinoId);

  const confirmar = () => {
    if (!destino) return;
    unir.mutate(
      { lista, origen: origen.id, destino: destino.id },
      {
        onSuccess: () => {
          toast.success(t("listas.avisos.unidos", { nombre: nombreVisible(destino, t) }));
          alCambiar(false);
        },
      },
    );
  };
  const noSonElMismo = () => {
    if (!destino || lista === "formas") return;
    distintos.mutate(
      { lista, a: origen.id, b: destino.id },
      {
        onSuccess: () => {
          toast.success(t("listas.avisos.distintos"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("listas.unir.titulo", { nombre: nombreVisible(origen, t) })}
      pie={
        <>
          {desdeDuplicado ? (
            <Button variant="secondary" onClick={noSonElMismo} disabled={distintos.isPending}>
              {t("listas.unir.noSonElMismo")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => alCambiar(false)}>
              {t("comun.cancelar")}
            </Button>
          )}
          <Button onClick={confirmar} disabled={!destino || unir.isPending}>
            {unir.isPending ? t("comun.guardando") : t("listas.unir.confirmar")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        <AvisoError error={unir.error ?? distintos.error} />
        <div className="flex flex-col gap-xs">
          <Label id="destino-unir">{t("listas.unir.conserva")}</Label>
          <RadioGroup
            value={destinoId}
            onValueChange={setDestinoId}
            aria-labelledby="destino-unir"
            className="gap-0"
          >
            {candidatos.map((c) => (
              <label
                key={c.id}
                className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control px-sm hover:bg-muted"
              >
                <RadioGroupItem value={c.id} aria-describedby={`usos-${c.id}`} />
                <span className="flex-1 text-body-md">{nombreVisible(c, t)}</span>
                <span
                  id={`usos-${c.id}`}
                  aria-hidden="true"
                  className="text-body-sm text-muted-foreground"
                >
                  {t(`listas.usos.${lista}`, { count: c.usos })}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>
            {destino
              ? t("listas.unir.aviso", {
                  origen: nombreVisible(origen, t),
                  destino: nombreVisible(destino, t),
                })
              : t("listas.unir.elige")}
          </p>
        </Alert>
      </div>
    </Ventana>
  );
}

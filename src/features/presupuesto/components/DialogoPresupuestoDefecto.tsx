import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useCambiarPresupuestoDefecto } from "@/datos/presupuesto";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  valorActual: number;
  /** Sin período abierto en curso, la casilla no aplica. */
  hayPeriodoEnCurso: boolean;
};

/** Presupuesto con que abre cada período; opcionalmente también el actual (supuesto 9). */
export function DialogoPresupuestoDefecto({
  abierta,
  alCambiar,
  valorActual,
  hayPeriodoEnCurso,
}: Props) {
  const { t } = useTranslation();
  const cambiar = useCambiarPresupuestoDefecto();
  const [valor, setValor] = useState<number | null>(valorActual);
  const [actual, setActual] = useState(false);
  const [intento, setIntento] = useState(false);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (valor === null) return;
    cambiar.mutate(
      { valor, actual: hayPeriodoEnCurso && actual },
      {
        onSuccess: () => {
          toast.success(t("presupuesto.guardado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("presupuesto.defectoDialogo.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-defecto" disabled={cambiar.isPending}>
            {cambiar.isPending ? t("comun.guardando") : t("comun.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-defecto"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("presupuesto.defectoDialogo.valor")}
          valor={valor}
          alCambiar={(v) => {
            setValor(v);
            setIntento(false);
            cambiar.reset();
          }}
          autoFocus
          ayuda={t("presupuesto.defectoDialogo.ayuda")}
          error={intento && valor === null ? t("presupuesto.defectoDialogo.requerido") : null}
        />
        {hayPeriodoEnCurso && (
          <label className="flex min-h-touch items-center gap-sm rounded-control border px-md cursor-pointer text-body-md">
            <Checkbox checked={actual} onCheckedChange={(v) => setActual(v === true)} />
            {t("presupuesto.defectoDialogo.usarEnActual")}
          </label>
        )}
        <AvisoError error={cambiar.error} />
      </form>
    </Ventana>
  );
}

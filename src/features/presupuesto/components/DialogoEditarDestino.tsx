import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useEditarDestino, type Destino } from "@/datos/cierre";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; destino: Destino };

/** Cambia el valor de un destino; el límite (lo no destinado) lo valida la base de datos (S7). */
export function DialogoEditarDestino({ abierta, alCambiar, destino }: Props) {
  const { t } = useTranslation();
  const editar = useEditarDestino();
  const [valor, setValor] = useState<number | null>(destino.valor);
  const [intento, setIntento] = useState(false);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valor) return;
    editar.mutate(
      { id: destino.id, valor },
      {
        onSuccess: () => {
          toast.success(t("cierre.avisos.guardado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("cierre.editar.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-destino" disabled={editar.isPending}>
            {editar.isPending ? t("comun.guardando") : t("comun.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-destino"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("cierre.editar.valor", { nombre: destino.nombre })}
          valor={valor}
          alCambiar={(v) => {
            setValor(v);
            editar.reset();
          }}
          autoFocus
          error={intento && !valor ? t("cierre.editar.valorRequerido") : null}
        />
        <AvisoError error={editar.error} />
      </form>
    </Ventana>
  );
}

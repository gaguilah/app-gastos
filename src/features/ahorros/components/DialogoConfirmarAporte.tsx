import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useConfirmarAporte, type Pendiente } from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; pendiente: Pendiente };

/** Ajusta el valor de un aporte pendiente antes de confirmarlo, esta vez o en adelante (3.15). */
export function DialogoConfirmarAporte({ abierta, alCambiar, pendiente }: Props) {
  const { t } = useTranslation();
  const confirmar = useConfirmarAporte();
  const [valor, setValor] = useState<number | null>(pendiente.valor);
  const [enAdelante, setEnAdelante] = useState(false);
  const [intento, setIntento] = useState(false);
  const frecuencia = t(`ahorros.confirmar.frecuencia.${pendiente.frecuencia}`);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valor) return;
    confirmar.mutate(
      { id: pendiente.id, valor, enAdelante },
      {
        onSuccess: () => {
          toast.success(t("ahorros.avisos.confirmado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("ahorros.confirmar.titulo")}
      descripcion={
        pendiente.origenNombre
          ? t("ahorros.confirmar.subtitulo", { frecuencia, origen: pendiente.origenNombre })
          : undefined
      }
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-confirmar" disabled={confirmar.isPending}>
            {confirmar.isPending ? t("comun.guardando") : t("ahorros.confirmar.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-confirmar"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <p className="text-body-md">
          {t("ahorros.pendientes.aporteA", { nombre: pendiente.metaNombre })}
        </p>
        <CampoMonto
          etiqueta={t("ahorros.confirmar.valor")}
          valor={valor}
          autoFocus
          alCambiar={(v) => {
            setValor(v);
            confirmar.reset();
          }}
          ayuda={t("ahorros.confirmar.reglaDice", { valor: formatearPesos(pendiente.valorRegla) })}
          error={intento && !valor ? t("ahorros.formulario.valorRequerido") : null}
        />
        <label className="flex min-h-touch cursor-pointer items-center gap-sm text-body-md">
          <Checkbox checked={enAdelante} onCheckedChange={(v) => setEnAdelante(v === true)} />
          {t("ahorros.confirmar.enAdelante")}
        </label>
        <AvisoError error={confirmar.error} />
      </form>
    </Ventana>
  );
}

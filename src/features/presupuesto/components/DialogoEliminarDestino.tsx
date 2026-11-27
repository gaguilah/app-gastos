import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { useEliminarDestino, type Destino } from "@/datos/cierre";
import { formatearPesos } from "@/dominio/dinero";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; destino: Destino };

/** Quita un destino: el dinero sale de la bolsa o la meta y vuelve a «No destinado» (S7). */
export function DialogoEliminarDestino({ abierta, alCambiar, destino }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarDestino();
  const confirmar = () =>
    eliminar.mutate(destino.id, {
      onSuccess: () => {
        toast.success(t("cierre.avisos.eliminado"));
        alCambiar(false);
      },
    });

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("cierre.eliminar.titulo")}
      descripcion={t("cierre.eliminar.descripcion", {
        valor: formatearPesos(destino.valor),
        nombre: destino.nombre,
      })}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("cierre.eliminar.quitar")}
          </Button>
        </>
      }
    >
      <AvisoError error={eliminar.error} />
    </Ventana>
  );
}

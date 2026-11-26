import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Ventana } from "@/components/shared/Ventana";
import { useEliminar, type Elemento, type Lista } from "@/datos/listas";
import { nombreVisible } from "../textos";
import { AvisoError } from "./AvisoError";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  lista: Lista;
  elemento: Elemento;
};

/** Borra si no tiene uso; si lo tiene, la base de datos lo archiva (supuesto 3). */
export function DialogoEliminarElemento({ abierta, alCambiar, lista, elemento }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminar();

  const confirmar = () =>
    eliminar.mutate(
      { lista, id: elemento.id },
      {
        onSuccess: (resultado) => {
          toast.success(
            t(resultado === "archivado" ? "listas.avisos.archivado" : "listas.avisos.eliminado"),
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
      titulo={t("listas.eliminar.titulo", { nombre: nombreVisible(elemento, t) })}
      descripcion={t("listas.eliminar.mensaje")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("listas.eliminar.confirmar")}
          </Button>
        </>
      }
    >
      <AvisoError error={eliminar.error} />
    </Ventana>
  );
}

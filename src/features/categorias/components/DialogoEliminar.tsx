import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Ventana } from "@/components/shared/Ventana";
import { useEliminarCategoria, type Categoria } from "@/datos/categorias";
import { claveErrorDatos } from "@/datos/errores";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  categoria: Categoria;
};

/** Confirma antes de borrar y explica qué conserva el historial (3.11, 3.14). */
export function DialogoEliminar({ abierta, alCambiar, categoria }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarCategoria();

  const confirmar = () =>
    eliminar.mutate(categoria.id, {
      onSuccess: (resultado) => {
        toast.success(
          t(
            resultado === "archivado"
              ? "categorias.avisos.archivada"
              : "categorias.avisos.eliminada",
          ),
        );
        alCambiar(false);
      },
    });

  const mensaje = [
    t("categorias.eliminar.mensaje"),
    categoria.subcategorias.length > 0 ? t("categorias.eliminar.conSub") : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("categorias.eliminar.titulo", { nombre: categoria.nombre })}
      descripcion={mensaje}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("categorias.eliminar.confirmar")}
          </Button>
        </>
      }
    >
      {eliminar.isError && (
        <Alert variant="error">
          <CircleAlert aria-hidden="true" />
          <p>{t(claveErrorDatos(eliminar.error))}</p>
        </Alert>
      )}
    </Ventana>
  );
}

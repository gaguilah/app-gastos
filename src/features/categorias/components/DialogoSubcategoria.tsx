import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/shared/Campo";
import { Ventana } from "@/components/shared/Ventana";
import { useAgregarSubcategoria, type Categoria } from "@/datos/categorias";
import { claveErrorDatos } from "@/datos/errores";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  categoria: Categoria;
};

/** Agregar una subcategoría desde el menú ⋮: hereda ícono y color de su categoría (3.11). */
export function DialogoSubcategoria({ abierta, alCambiar, categoria }: Props) {
  const { t } = useTranslation();
  const agregar = useAgregarSubcategoria();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) {
      setError(t("categorias.formulario.nombreObligatorio"));
      return;
    }
    const repetida = categoria.subcategorias.some(
      (s) => s.nombre.localeCompare(texto, "es", { sensitivity: "base" }) === 0,
    );
    if (repetida) {
      setError(t("categorias.formulario.subRepetida"));
      return;
    }
    agregar.mutate(
      { padre: { id: categoria.id, tipo: categoria.tipo }, nombre: texto },
      {
        onSuccess: () => {
          toast.success(t("categorias.avisos.subAgregada"));
          alCambiar(false);
        },
      },
    );
  };

  const yaTiene = categoria.subcategorias.map((s) => s.nombre).join(", ");

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("categorias.subcategoria.titulo", { nombre: categoria.nombre })}
      descripcion={t("categorias.subcategoria.hereda", { nombre: categoria.nombre })}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-subcategoria" disabled={agregar.isPending}>
            {agregar.isPending ? t("comun.guardando") : t("categorias.subcategoria.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-subcategoria"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        {agregar.isError && (
          <Alert variant="error">
            <CircleAlert aria-hidden="true" />
            <p>{t(claveErrorDatos(agregar.error))}</p>
          </Alert>
        )}
        <Campo
          etiqueta={t("categorias.formulario.nombre")}
          autoComplete="off"
          value={nombre}
          error={error}
          onChange={(e) => {
            setNombre(e.target.value);
            setError(null);
          }}
        />
        {yaTiene && (
          <p className="text-body-sm text-muted-foreground">
            {t("categorias.subcategoria.yaTiene", { lista: yaTiene })}
          </p>
        )}
      </form>
    </Ventana>
  );
}

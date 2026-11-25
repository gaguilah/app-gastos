import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/shared/Campo";
import { Ventana } from "@/components/shared/Ventana";
import { useRenombrar, type Elemento, type Lista } from "@/datos/listas";
import { esNombreRepetido } from "@/datos/errores";
import { nombreVisible } from "../textos";
import { AvisoError } from "./AvisoError";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  lista: Lista;
  elemento: Elemento;
  /** Si el nombre nuevo ya existe, se ofrece unir en vez de fallar (criterio de la spec #10). */
  alUnir: (nombre: string) => void;
};

export function DialogoRenombrar({ abierta, alCambiar, lista, elemento, alUnir }: Props) {
  const { t } = useTranslation();
  const renombrar = useRenombrar();
  const [nombre, setNombre] = useState(elemento.nombre);
  const [vacio, setVacio] = useState(false);
  const repetido = esNombreRepetido(renombrar.error);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) {
      setVacio(true);
      return;
    }
    if (texto === elemento.nombre) {
      alCambiar(false);
      return;
    }
    renombrar.mutate(
      { lista, id: elemento.id, nombre: texto },
      {
        onSuccess: () => {
          toast.success(t("listas.avisos.renombrado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("listas.renombrar.titulo", { nombre: nombreVisible(elemento, t) })}
      descripcion={t("listas.renombrar.ayuda")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          {repetido ? (
            <Button onClick={() => alUnir(nombre.trim())}>{t("listas.renombrar.unirlos")}</Button>
          ) : (
            <Button type="submit" form="formulario-renombrar" disabled={renombrar.isPending}>
              {renombrar.isPending ? t("comun.guardando") : t("listas.renombrar.guardar")}
            </Button>
          )}
        </>
      }
    >
      <form
        id="formulario-renombrar"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <Campo
          etiqueta={t("listas.nuevo.nombre")}
          autoComplete="off"
          value={nombre}
          error={
            vacio
              ? t("categorias.formulario.nombreObligatorio")
              : repetido
                ? t("listas.renombrar.yaExiste")
                : null
          }
          onChange={(e) => {
            setNombre(e.target.value);
            setVacio(false);
            renombrar.reset();
          }}
        />
        {!repetido && <AvisoError error={renombrar.error} />}
      </form>
    </Ventana>
  );
}

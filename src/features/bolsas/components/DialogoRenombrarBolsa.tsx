import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { Ventana } from "@/components/shared/Ventana";
import { useRenombrarBolsa, type Bolsa } from "@/datos/bolsas";
import { esNombreBolsaRepetido } from "../textos";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; bolsa: Bolsa };

/** Cambia el nombre de la bolsa y de su forma de pago; el historial muestra el nuevo (supuesto 4). */
export function DialogoRenombrarBolsa({ abierta, alCambiar, bolsa }: Props) {
  const { t } = useTranslation();
  const renombrar = useRenombrarBolsa();
  const [nombre, setNombre] = useState(bolsa.nombre);
  const [vacio, setVacio] = useState(false);
  const repetido = esNombreBolsaRepetido(renombrar.error);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) {
      setVacio(true);
      return;
    }
    if (texto === bolsa.nombre) {
      alCambiar(false);
      return;
    }
    renombrar.mutate(
      { id: bolsa.id, nombre: texto },
      {
        onSuccess: () => {
          toast.success(t("bolsas.avisos.renombrada"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.renombrar.titulo")}
      descripcion={t("bolsas.renombrar.ayuda")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-renombrar-bolsa" disabled={renombrar.isPending}>
            {renombrar.isPending ? t("comun.guardando") : t("bolsas.renombrar.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-renombrar-bolsa"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <Campo
          etiqueta={t("bolsas.nuevaDialogo.nombre")}
          autoComplete="off"
          maxLength={60}
          value={nombre}
          error={
            vacio
              ? t("categorias.formulario.nombreObligatorio")
              : repetido
                ? t("bolsas.nuevaDialogo.repetido")
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

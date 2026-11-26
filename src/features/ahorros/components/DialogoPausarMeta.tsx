import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { usePausarMeta, type Meta } from "@/datos/ahorros";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; meta: Meta };

/** Pausa la meta: se detienen los aportes periódicos y lo ahorrado se queda (3.15). */
export function DialogoPausarMeta({ abierta, alCambiar, meta }: Props) {
  const { t } = useTranslation();
  const pausar = usePausarMeta();

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("ahorros.pausar.titulo", { nombre: meta.nombre })}
      descripcion={t("ahorros.pausar.mensaje")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button
            disabled={pausar.isPending}
            onClick={() =>
              pausar.mutate(meta.id, {
                onSuccess: () => {
                  toast.success(t("ahorros.avisos.pausada"));
                  alCambiar(false);
                },
              })
            }
          >
            {pausar.isPending ? t("comun.guardando") : t("ahorros.pausar.pausar")}
          </Button>
        </>
      }
    >
      <AvisoError error={pausar.error} />
    </Ventana>
  );
}

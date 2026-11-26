import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { useOmitirAporte, type Pendiente } from "@/datos/ahorros";
import { fechaLarga } from "@/dominio/fechas";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; pendiente: Pendiente };

/** Omite un aporte pendiente: no mueve dinero y la fecha final no cambia (3.15). */
export function DialogoOmitirAporte({ abierta, alCambiar, pendiente }: Props) {
  const { t, i18n } = useTranslation();
  const omitir = useOmitirAporte();

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("ahorros.omitir.titulo", { fecha: fechaLarga(pendiente.fecha, i18n.language) })}
      descripcion={t("ahorros.omitir.mensaje")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button
            disabled={omitir.isPending}
            onClick={() =>
              omitir.mutate(pendiente.id, {
                onSuccess: () => {
                  toast.success(t("ahorros.avisos.omitido"));
                  alCambiar(false);
                },
              })
            }
          >
            {omitir.isPending ? t("comun.guardando") : t("ahorros.omitir.omitir")}
          </Button>
        </>
      }
    >
      <AvisoError error={omitir.error} />
    </Ventana>
  );
}

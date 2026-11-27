import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { useBolsas } from "@/datos/bolsas";
import { aportePresupuesto, useEliminarIngreso, type Ingreso } from "@/datos/ingresos";
import { usePresupuesto } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; ingreso: Ingreso };

/** Confirma y dice cuánto baja la bolsa y el presupuesto («Nequi baja de $412.300 a $62.300»). */
export function DialogoEliminarIngreso({ abierta, alCambiar, ingreso }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarIngreso();
  const { data: bolsas } = useBolsas();
  const { data: presupuesto } = usePresupuesto();

  // Lo que baja: la bolsa, el presupuesto o los dos (Etapa 6A, S3).
  const efectos = () => {
    const bolsa = ingreso.bolsaId && bolsas?.find((b) => b.id === ingreso.bolsaId);
    const periodo = presupuesto?.periodos.find(
      (p) => p.inicio <= ingreso.fecha && ingreso.fecha <= p.fin,
    );
    const aporte = aportePresupuesto(ingreso);
    return [
      bolsa &&
        t("ingresos.eliminar.bolsaBaja", {
          nombre: bolsa.nombre,
          antes: formatearPesos(bolsa.saldo),
          despues: formatearPesos(bolsa.saldo - ingreso.valor),
        }),
      periodo &&
        aporte > 0 &&
        t("ingresos.eliminar.presupuestoBaja", {
          antes: formatearPesos(periodo.disponible),
          despues: formatearPesos(periodo.disponible - aporte),
        }),
    ];
  };

  const confirmar = () =>
    eliminar.mutate(
      { id: ingreso.id, fecha: ingreso.fecha },
      {
        onSuccess: (advertencia) => {
          toast.success(t("ingresos.avisos.eliminado"));
          if (advertencia) toast.warning(t("ingresos.avisos.sobranteNegativo"));
          alCambiar(false);
        },
      },
    );

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("ingresos.eliminar.titulo", { titulo: ingreso.titulo })}
      descripcion={[...efectos(), t("ingresos.eliminar.noDeshacer")].filter(Boolean).join(" ")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("ingresos.eliminar.eliminar")}
          </Button>
        </>
      }
    >
      {eliminar.error ? (
        <div className="pb-md">
          <AvisoError error={eliminar.error} />
        </div>
      ) : null}
    </Ventana>
  );
}

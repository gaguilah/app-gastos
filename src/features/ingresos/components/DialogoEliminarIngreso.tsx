import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Ventana } from "@/components/shared/Ventana";
import { useBolsas } from "@/datos/bolsas";
import { useEliminarIngreso, type Ingreso } from "@/datos/ingresos";
import { usePresupuesto } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; ingreso: Ingreso };

/** Confirma y dice cuánto baja el destino («Nequi baja de $412.300 a $62.300»). */
export function DialogoEliminarIngreso({ abierta, alCambiar, ingreso }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarIngreso();
  const { data: bolsas } = useBolsas();
  const { data: presupuesto } = usePresupuesto();

  const efecto = () => {
    if (ingreso.bolsaId) {
      const bolsa = bolsas?.find((b) => b.id === ingreso.bolsaId);
      return (
        bolsa &&
        t("ingresos.eliminar.bolsaBaja", {
          nombre: bolsa.nombre,
          antes: formatearPesos(bolsa.saldo),
          despues: formatearPesos(bolsa.saldo - ingreso.valor),
        })
      );
    }
    const periodo = presupuesto?.periodos.find(
      (p) => p.inicio <= ingreso.fecha && ingreso.fecha <= p.fin,
    );
    return (
      periodo &&
      t("ingresos.eliminar.presupuestoBaja", {
        antes: formatearPesos(periodo.disponible),
        despues: formatearPesos(periodo.disponible - ingreso.valor),
      })
    );
  };

  const confirmar = () =>
    eliminar.mutate(
      { id: ingreso.id, fecha: ingreso.fecha },
      {
        onSuccess: () => {
          toast.success(t("ingresos.avisos.eliminado"));
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
      descripcion={[efecto(), t("ingresos.eliminar.noDeshacer")].filter(Boolean).join(" ")}
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

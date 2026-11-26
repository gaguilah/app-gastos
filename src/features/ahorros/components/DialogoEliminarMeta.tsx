import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { Ventana } from "@/components/shared/Ventana";
import { useEliminarMeta, type Meta } from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; meta: Meta };

/** Elimina la meta; si tiene saldo, el dinero pasa a la bolsa elegida (supuesto 24). */
export function DialogoEliminarMeta({ abierta, alCambiar, meta }: Props) {
  const { t } = useTranslation();
  const eliminar = useEliminarMeta();
  const conSaldo = meta.saldo > 0;
  const [destino, setDestino] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);

  const confirmar = () => {
    setIntento(true);
    if (conSaldo && !destino) return;
    eliminar.mutate(
      { id: meta.id, bolsaId: conSaldo ? destino : null },
      {
        onSuccess: () => {
          toast.success(t("ahorros.avisos.eliminada"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("ahorros.eliminar.titulo", { nombre: meta.nombre })}
      descripcion={
        conSaldo
          ? t("ahorros.eliminar.conSaldo", { saldo: formatearPesos(meta.saldo) })
          : t("ahorros.eliminar.sinSaldo")
      }
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
            {eliminar.isPending ? t("comun.guardando") : t("ahorros.eliminar.eliminar")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        {conSaldo && (
          <SelectorBolsa
            etiqueta={t("ahorros.eliminar.destino")}
            valor={destino}
            alCambiar={setDestino}
            error={intento && !destino ? t("ahorros.eliminar.elegirDestino") : null}
          />
        )}
        <AvisoError error={eliminar.error} />
      </div>
    </Ventana>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useCrearBolsa } from "@/datos/bolsas";
import { esNombreBolsaRepetido } from "../textos";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void };

/** Bolsa nueva con saldo inicial opcional; crea también su forma de pago (supuesto 3). */
export function DialogoNuevaBolsa({ abierta, alCambiar }: Props) {
  const { t } = useTranslation();
  const crear = useCrearBolsa();
  const [nombre, setNombre] = useState("");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [vacio, setVacio] = useState(false);
  const repetido = esNombreBolsaRepetido(crear.error);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) {
      setVacio(true);
      return;
    }
    crear.mutate(
      { nombre: texto, saldoInicial: saldo ?? 0 },
      {
        onSuccess: () => {
          toast.success(t("bolsas.avisos.creada"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("bolsas.nueva")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-bolsa" disabled={crear.isPending}>
            {crear.isPending ? t("comun.guardando") : t("bolsas.nuevaDialogo.crear")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-bolsa"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <Campo
          etiqueta={t("bolsas.nuevaDialogo.nombre")}
          autoComplete="off"
          autoFocus
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
            crear.reset();
          }}
        />
        <CampoMonto
          etiqueta={t("bolsas.nuevaDialogo.saldoInicial")}
          valor={saldo}
          alCambiar={setSaldo}
          ayuda={t("bolsas.nuevaDialogo.ayudaSaldo")}
        />
        {!repetido && <AvisoError error={crear.error} />}
      </form>
    </Ventana>
  );
}

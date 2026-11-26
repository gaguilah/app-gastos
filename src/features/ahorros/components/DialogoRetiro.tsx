import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { Ventana } from "@/components/shared/Ventana";
import { useRetirarMeta, type Meta } from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";
import { avanceMeta } from "../textos";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; meta: Meta };

/** Retiro hacia una bolsa, con motivo; no pasa del saldo de la meta (supuesto 23). */
export function DialogoRetiro({ abierta, alCambiar, meta }: Props) {
  const { t } = useTranslation();
  const retirar = useRetirarMeta();
  const [valor, setValor] = useState<number | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [intento, setIntento] = useState(false);
  const excede = valor !== null && valor > meta.saldo;
  const errorValor = excede
    ? t("ahorros.retiro.excede", { saldo: formatearPesos(meta.saldo) })
    : intento && !valor
      ? t("ahorros.formulario.valorRequerido")
      : null;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valor || excede || !destino) return;
    retirar.mutate(
      { metaId: meta.id, valor, bolsaId: destino, motivo: motivo.trim() },
      {
        onSuccess: () => {
          toast.success(t("ahorros.avisos.retiro"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("ahorros.retiro.titulo", { nombre: meta.nombre })}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-retiro" disabled={retirar.isPending}>
            {retirar.isPending ? t("comun.guardando") : t("ahorros.retiro.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-retiro"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <CampoMonto
          etiqueta={t("ahorros.retiro.valor")}
          valor={valor}
          autoFocus
          alCambiar={(v) => {
            setValor(v);
            retirar.reset();
          }}
          error={errorValor}
        />
        <Campo
          etiqueta={t("ahorros.retiro.motivo")}
          autoComplete="off"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <SelectorBolsa
          etiqueta={t("ahorros.retiro.destino")}
          valor={destino}
          alCambiar={setDestino}
          error={intento && !destino ? t("ahorros.retiro.elegirDestino") : null}
        />
        {valor && !excede && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {t("ahorros.retiro.bajaA", {
              saldo: formatearPesos(meta.saldo - valor),
              porcentaje: avanceMeta(meta.saldo - valor, meta.monto),
            })}
          </p>
        )}
        <AvisoError error={retirar.error} />
      </form>
    </Ventana>
  );
}

import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { Ventana } from "@/components/shared/Ventana";
import { useCambiarDiaInicio, useVistaPreviaPeriodos } from "@/datos/presupuesto";
import { rangoPeriodo } from "@/dominio/fechas";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  perfilId: string;
  diaActual: number;
};

type Opcion = "1" | "15" | "otro";
const filas = ["actual", "siguiente", "despues"] as const;

const leerDia = (texto: string) => (/^\d{1,2}$/.test(texto) ? Number(texto) : null);
const valido = (dia: number | null): dia is number => dia !== null && dia >= 1 && dia <= 31;

/** Cambia el día de inicio con la vista previa de los tres períodos que vienen (3.1). */
export function DialogoDiaInicio({ abierta, alCambiar, perfilId, diaActual }: Props) {
  const { t, i18n } = useTranslation();
  const cambiar = useCambiarDiaInicio();
  const [opcion, setOpcion] = useState<Opcion>(
    diaActual === 1 ? "1" : diaActual === 15 ? "15" : "otro",
  );
  const [otro, setOtro] = useState(opcion === "otro" ? String(diaActual) : "");
  const [intento, setIntento] = useState(false);
  const dia = opcion === "otro" ? leerDia(otro) : Number(opcion);
  const previa = useVistaPreviaPeriodos(valido(dia) ? dia : null);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valido(dia)) return;
    if (dia === diaActual) {
      alCambiar(false);
      return;
    }
    cambiar.mutate(
      { perfilId, dia },
      {
        onSuccess: () => {
          toast.success(t("presupuesto.guardado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("presupuesto.dia.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-dia" disabled={cambiar.isPending}>
            {cambiar.isPending ? t("comun.guardando") : t("comun.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-dia"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <fieldset className="flex flex-col gap-xs">
          <legend className="mb-xs text-body-md font-medium">{t("presupuesto.dia.empieza")}</legend>
          <RadioGroup
            value={opcion}
            onValueChange={(v) => {
              setOpcion(v as Opcion);
              setIntento(false);
              cambiar.reset();
            }}
            className="grid-cols-3"
          >
            {(["1", "15", "otro"] as const).map((o) => (
              <label
                key={o}
                className="flex min-h-touch items-center gap-sm rounded-control border px-md has-[[data-state=checked]]:border-primary cursor-pointer text-body-md"
              >
                <RadioGroupItem value={o} />
                {t(`presupuesto.dia.${o === "1" ? "uno" : o === "15" ? "quince" : "otro"}`)}
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        {opcion === "otro" && (
          <Campo
            etiqueta={t("presupuesto.dia.otroCampo")}
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={otro}
            autoFocus
            error={intento && !valido(dia) ? t("presupuesto.dia.otroError") : null}
            onChange={(e) => {
              setOtro(e.target.value.replace(/\D/g, ""));
              setIntento(false);
            }}
          />
        )}

        {valido(dia) && (
          <>
            {previa.isError ? (
              <p className="text-body-sm text-muted-foreground">
                {t("presupuesto.dia.previaError")}
              </p>
            ) : (
              <dl className="flex flex-col rounded-card border">
                {filas.map((fila, i) => {
                  const periodo = previa.data?.[i];
                  return (
                    <div
                      key={fila}
                      className="flex items-center justify-between gap-md border-t px-md py-sm first:border-t-0"
                    >
                      <dt className="text-body-sm text-muted-foreground">
                        {t(`presupuesto.dia.${fila}`)}
                      </dt>
                      <dd className="text-body-md font-medium">
                        {periodo ? (
                          rangoPeriodo(periodo.inicio, periodo.fin, i18n.language)
                        ) : (
                          <Skeleton className="h-md w-xl" />
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
            <p className="flex gap-xs text-body-sm text-muted-foreground">
              <Info className="mt-xs size-icono-sm shrink-0" aria-hidden="true" />
              <span>
                {dia === 1
                  ? t("presupuesto.dia.explicaUno")
                  : t("presupuesto.dia.explicaOtro", { dia, anterior: dia - 1 })}
                {dia >= 29 && ` ${t("presupuesto.dia.mesCorto")}`}
              </span>
            </p>
          </>
        )}
        <AvisoError error={cambiar.error} />
      </form>
    </Ventana>
  );
}

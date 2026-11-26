import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { useMedios } from "@/datos/ahorros";

type Props = {
  etiqueta: string;
  /** Id de la bolsa o «medio:<id>». */
  valor: string | null;
  alCambiar: (valor: string) => void;
  afecta: boolean;
  alCambiarAfecta: (afecta: boolean) => void;
  /** Lo que saldría de la bolsa elegida, para avisar si queda en negativo. */
  salida?: number | null;
  error?: string | null;
};

/**
 * Origen de un aporte: una bolsa con su saldo o un medio directo (Débito, Transferencia). Solo
 * desde un medio se puede marcar «Afecta el presupuesto» (decisión del 18-nov-2026).
 */
export function SelectorOrigen({
  etiqueta,
  valor,
  alCambiar,
  afecta,
  alCambiarAfecta,
  salida,
  error,
}: Props) {
  const { t } = useTranslation();
  const { data: medios } = useMedios();
  const esMedio = Boolean(valor?.startsWith("medio:"));
  return (
    <div className="flex flex-col gap-sm">
      <SelectorBolsa
        etiqueta={etiqueta}
        valor={valor}
        alCambiar={alCambiar}
        salida={esMedio ? null : salida}
        extras={(medios ?? []).map((m) => ({ valor: `medio:${m.id}`, etiqueta: m.nombre }))}
        error={error}
      />
      {esMedio && (
        <label className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md py-sm text-body-md">
          <Checkbox checked={afecta} onCheckedChange={(v) => alCambiarAfecta(v === true)} />
          <span className="flex flex-col">
            {t("ahorros.formulario.afecta")}
            <span className="text-body-sm text-muted-foreground">
              {t("ahorros.formulario.afectaAyuda")}
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

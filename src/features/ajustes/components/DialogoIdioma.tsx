import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cambiarIdioma, idiomas, type Idioma } from "@/i18n";
import { Ventana } from "@/components/shared/Ventana";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; actual: Idioma };

/** Elige el idioma; se aplica al guardar, sin recargar. */
export function DialogoIdioma({ abierta, alCambiar, actual }: Props) {
  const { t } = useTranslation();
  const [elegido, setElegido] = useState(actual);

  const cambiarApertura = (valor: boolean) => {
    if (valor) setElegido(actual);
    alCambiar(valor);
  };
  const guardar = async () => {
    await cambiarIdioma(elegido);
    alCambiar(false);
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={cambiarApertura}
      titulo={t("ajustes.idioma")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button onClick={guardar}>{t("comun.guardar")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        <RadioGroup
          value={elegido}
          onValueChange={(v) => setElegido(v as Idioma)}
          aria-label={t("ajustes.idioma")}
          className="gap-0"
        >
          {idiomas.map((idioma) => (
            <label
              key={idioma}
              lang={idioma}
              className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control px-sm hover:bg-muted"
            >
              <RadioGroupItem value={idioma} />
              <span className="flex flex-col">
                <span className="text-title">{t(`ajustes.nombreIdioma.${idioma}`)}</span>
                {idioma === "es" && (
                  <span className="text-body-sm text-muted-foreground">
                    {t("ajustes.regionEspanol")}
                  </span>
                )}
              </span>
            </label>
          ))}
        </RadioGroup>
        <p className="text-body-sm text-muted-foreground">{t("ajustes.notaMontos")}</p>
      </div>
    </Ventana>
  );
}

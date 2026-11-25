import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { iconoDe, nombresIconos, paletaCategorias } from "./iconos-categoria";

type Props = {
  icono: string;
  color: string;
  alCambiarIcono: (icono: string) => void;
  alCambiarColor: (color: string) => void;
};

const opcion =
  "inline-flex size-touch items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Rejilla de íconos Lucide y muestras de color de 44 px (DESIGN.md §4, organismo de Categorías). */
export function SelectorIconoColor({ icono, color, alCambiarIcono, alCambiarColor }: Props) {
  const { t } = useTranslation();
  // Un color guardado fuera de la paleta (o un ícono fuera de la lista) sigue visible y elegido.
  const colores = paletaCategorias.some((c) => c.hex.toLowerCase() === color.toLowerCase())
    ? paletaCategorias
    : [...paletaCategorias, { clave: "actual", hex: color }];
  const iconos = nombresIconos.includes(icono as never) ? nombresIconos : [icono, ...nombresIconos];

  return (
    <div className="flex flex-col gap-md">
      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-sm text-label-tag text-muted-foreground uppercase">
          {t("selector.icono")}
        </legend>
        <div className="flex flex-wrap gap-xs">
          {iconos.map((nombre) => {
            const Icono = iconoDe(nombre);
            const elegido = nombre === icono;
            return (
              <button
                key={nombre}
                type="button"
                aria-pressed={elegido}
                aria-label={t(`iconos.${nombre}`, { defaultValue: t("iconos.ellipsis") })}
                onClick={() => alCambiarIcono(nombre)}
                className={cn(
                  opcion,
                  "border text-foreground",
                  elegido ? "border-primary bg-accent text-accent-foreground" : "border-border",
                )}
              >
                <Icono className="size-icono" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-sm text-label-tag text-muted-foreground uppercase">
          {t("selector.color")}
        </legend>
        <div className="flex flex-wrap gap-sm">
          {colores.map(({ clave, hex }) => {
            const elegido = hex.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={clave}
                type="button"
                aria-pressed={elegido}
                aria-label={t(`colores.${clave}`)}
                onClick={() => alCambiarColor(hex)}
                className={cn(opcion, "rounded-full text-primary-foreground")}
                style={{ backgroundColor: hex }}
              >
                {elegido && <Check className="size-icono" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

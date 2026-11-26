import { useId } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategorias, type TipoCategoria } from "@/datos/categorias";
import { cn } from "@/lib/utils";
import { IconoCategoria } from "./IconoCategoria";

export type ValorCategoria = { categoria: string | null; subcategoria: string | null };

type Props = {
  etiqueta: string;
  /** Solo se ofrecen categorías de este tipo (3.11). */
  tipo: TipoCategoria;
  valor: ValorCategoria;
  alCambiar: (valor: ValorCategoria) => void;
  /** Mensaje ya traducido. */
  error?: string | null;
};

const SIN_SUBCATEGORIA = "ninguna";

/** Categorías del tipo que toca, con ícono y color, y su subcategoría opcional (DESIGN.md §4). */
export function SelectorCategoria({ etiqueta, tipo, valor, alCambiar, error }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const { data, isPending } = useCategorias();
  const categorias = (data ?? []).filter((c) => c.tipo === tipo);
  const elegida = categorias.find((c) => c.id === valor.categoria);

  return (
    <div className="flex flex-col gap-sm">
      <div role="group" aria-labelledby={`${id}-etiqueta`} className="flex flex-col gap-xs">
        <Label id={`${id}-etiqueta`} asChild>
          <span>{etiqueta}</span>
        </Label>
        {isPending ? (
          <div className="grid grid-cols-2 gap-xs" aria-label={t("app.cargando")}>
            <Skeleton className="h-touch" />
            <Skeleton className="h-touch" />
          </div>
        ) : (
          <RadioGroup
            value={valor.categoria ?? ""}
            onValueChange={(categoria) => alCambiar({ categoria, subcategoria: null })}
            aria-labelledby={`${id}-etiqueta`}
            aria-invalid={Boolean(error) || undefined}
            className="grid grid-cols-2 gap-xs xl:grid-cols-3"
          >
            {categorias.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-sm py-xs has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  valor.categoria === c.id && "border-primary bg-accent",
                )}
              >
                <RadioGroupItem value={c.id} className="sr-only" />
                <IconoCategoria icono={c.icono} color={c.color} className="size-campo" />
                <span className="min-w-0 truncate text-body-md">{c.nombre}</span>
              </label>
            ))}
          </RadioGroup>
        )}
        {error && (
          <p className="flex items-center gap-xs text-body-sm text-destructive">
            <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>

      {elegida && elegida.subcategorias.length > 0 && (
        <div role="group" aria-labelledby={`${id}-sub`} className="flex flex-col gap-xs">
          <Label id={`${id}-sub`} asChild>
            <span>{t("categorias.selector.subcategoria")}</span>
          </Label>
          <RadioGroup
            value={valor.subcategoria ?? SIN_SUBCATEGORIA}
            onValueChange={(s) =>
              alCambiar({ ...valor, subcategoria: s === SIN_SUBCATEGORIA ? null : s })
            }
            aria-labelledby={`${id}-sub`}
            className="flex flex-wrap gap-xs"
          >
            {[
              { id: SIN_SUBCATEGORIA, nombre: t("categorias.selector.ninguna") },
              ...elegida.subcategorias,
            ].map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex min-h-touch cursor-pointer items-center rounded-chip border px-md has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  (valor.subcategoria ?? SIN_SUBCATEGORIA) === s.id && "border-primary bg-accent",
                )}
              >
                <RadioGroupItem value={s.id} className="sr-only" />
                <span className="text-body-md">{s.nombre}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}

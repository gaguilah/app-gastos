import { createElement } from "react";
import { cn } from "@/lib/utils";
import { iconoDe } from "./iconos-categoria";

type Props = {
  icono: string | null | undefined;
  color: string | null | undefined;
  className?: string;
};

/** Ícono de la categoría en su color, sobre un fondo del mismo color al 12 % (DESIGN.md §2.1). */
export function IconoCategoria({ icono, color, className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-touch shrink-0 items-center justify-center rounded-control text-muted-foreground",
        className,
      )}
      style={
        color
          ? { color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }
          : undefined
      }
    >
      {createElement(iconoDe(icono), { className: "size-icono" })}
    </span>
  );
}

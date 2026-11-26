import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// DESIGN.md §4 · Barra de presupuesto: el color del relleno lo pone quien la usa (alerta-*).
function Progress({
  className,
  indicador,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicador?: string }) {
  const relleno = Math.min(Math.max(value ?? 0, 0), 100);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-sm w-full overflow-hidden rounded-full bg-muted", className)}
      value={relleno}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 bg-primary transition-transform", indicador)}
        style={{ transform: `translateX(-${100 - relleno}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

import type { ReactNode } from "react";
import { RadioGroupItem } from "@/components/ui/radio-group";

/** Fila con borde y área táctil completa para un RadioGroup (DESIGN.md §8). */
export function OpcionRadio({
  valor,
  children,
  ayuda,
}: {
  valor: string;
  children: ReactNode;
  ayuda?: ReactNode;
}) {
  return (
    <label className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md py-sm text-body-md has-[[data-state=checked]]:border-primary">
      <RadioGroupItem value={valor} />
      <span className="flex flex-col">
        {children}
        {ayuda && <span className="text-body-sm text-muted-foreground">{ayuda}</span>}
      </span>
    </label>
  );
}

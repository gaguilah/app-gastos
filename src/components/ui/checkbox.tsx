import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// El área táctil la da la fila que envuelve la casilla (DESIGN.md §8: 44 × 44 px).
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-icono shrink-0 items-center justify-center rounded-chip border-2 border-input outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check className="size-icono-sm" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

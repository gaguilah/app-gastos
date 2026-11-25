import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// DESIGN.md §4: pending (Pendiente), ok (Confirmado) y neutral (Sistema). Siempre con palabra.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-xs rounded-chip px-sm py-xs text-label-tag whitespace-nowrap uppercase [&>svg]:size-icono-sm [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        pending: "bg-warning-soft text-warning-ink",
        ok: "bg-accent text-accent-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };

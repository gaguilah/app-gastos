import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// DESIGN.md §4 · Aviso: warning, error, success y la barra oscura de sin conexión. Siempre ícono y texto.
const alertVariants = cva(
  "flex w-full items-start gap-sm rounded-control px-md py-sm text-body-sm [&>svg]:size-icono [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        error: "bg-destructive-soft text-destructive",
        warning: "bg-warning-soft text-warning-ink",
        success: "bg-accent text-accent-foreground",
        offline: "rounded-none bg-foreground text-background",
      },
    },
    defaultVariants: { variant: "error" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === "offline" ? "status" : "alert"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };

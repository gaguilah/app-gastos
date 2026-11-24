import * as React from "react";
import { cn } from "@/lib/utils";

// DESIGN.md §4: 48 px, borde input; con error, borde de 2 px destructive y aria-invalid.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-campo w-full min-w-0 rounded-control border border-input bg-card px-md text-campo text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted md:text-body-md",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-2 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

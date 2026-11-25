import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

// DESIGN.md §4 · Diálogo: encabezado con cerrar, cuerpo y pie con acciones.
// `etiquetaCerrar` llega traducida: este átomo no tiene textos propios.
function DialogContent({
  className,
  children,
  etiquetaCerrar,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { etiquetaCerrar?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2*var(--spacing-md))] max-w-tarjeta-auth -translate-x-1/2 -translate-y-1/2 gap-md rounded-sheet bg-popover p-lg text-popover-foreground shadow-dialog outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {etiquetaCerrar && (
          <DialogPrimitive.Close
            className="absolute top-sm right-sm inline-flex size-touch items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={etiquetaCerrar}
          >
            <XIcon className="size-icono" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-xs pr-xl", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-sm sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-headline-sm", className)} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-body-md text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};

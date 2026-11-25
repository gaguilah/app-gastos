import { Toaster as Sonner, type ToasterProps } from "sonner";

// Aviso flotante (DESIGN.md §4). Modo claro en el MVP; el oscuro llegará con sus tokens.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-card !border !border-border !bg-popover !text-popover-foreground !shadow-menu !font-sans !text-body-md",
          actionButton: "!min-h-touch !rounded-control !bg-primary !text-primary-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };

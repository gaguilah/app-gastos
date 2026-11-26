import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useEsMovil } from "@/lib/useEsMovil";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  titulo: string;
  descripcion?: string;
  /** "alertdialog" para confirmar una acción (DESIGN.md §8). */
  rol?: "dialog" | "alertdialog";
  children?: ReactNode;
  pie: ReactNode;
  /** Formulario: más ancho en computador y panel derecho en tablet (DESIGN.md §3). */
  formulario?: boolean;
};

/** Hoja inferior en el móvil y diálogo centrado en tablet y computador (DESIGN.md §4). */
export function Ventana({
  abierta,
  alCambiar,
  titulo,
  descripcion,
  rol,
  children,
  pie,
  formulario = false,
}: Props) {
  const { t } = useTranslation();
  // Sin descripción, Radix pide declararlo explícitamente para no avisar en consola.
  // El rol solo se pasa si cambia: un `role={undefined}` borraría el "dialog" de Radix.
  const atributos = {
    ...(rol && { role: rol }),
    ...(!descripcion && { "aria-describedby": undefined }),
  };

  if (useEsMovil()) {
    return (
      <Drawer open={abierta} onOpenChange={alCambiar}>
        <DrawerContent {...atributos}>
          <DrawerHeader>
            <DrawerTitle>{titulo}</DrawerTitle>
            {descripcion && <DrawerDescription>{descripcion}</DrawerDescription>}
          </DrawerHeader>
          {children && <div className="overflow-y-auto px-md">{children}</div>}
          <DrawerFooter>{pie}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={abierta} onOpenChange={alCambiar}>
      <DialogContent
        etiquetaCerrar={rol === "alertdialog" ? undefined : t("comun.cerrar")}
        className={cn(
          formulario &&
            "max-h-[calc(100dvh-2*var(--spacing-lg))] max-w-formulario grid-rows-[auto_1fr_auto] md:max-xl:top-0 md:max-xl:right-0 md:max-xl:left-auto md:max-xl:h-dvh md:max-xl:max-h-dvh md:max-xl:w-full md:max-xl:translate-x-0 md:max-xl:translate-y-0 md:max-xl:rounded-none",
        )}
        {...atributos}
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {formulario ? <div className="-mx-xs overflow-y-auto px-xs">{children}</div> : children}
        <DialogFooter>{pie}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

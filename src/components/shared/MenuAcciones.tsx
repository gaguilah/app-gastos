import { useState, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";
import { useEsMovil } from "@/lib/useEsMovil";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export type Accion = {
  clave: string;
  etiqueta: string;
  icono: ReactNode;
  alElegir: () => void;
  /** Borrar o eliminar: va al final, separado y en destructive (DESIGN.md §4). */
  destructiva?: boolean;
  /** Si no se puede, se muestra deshabilitada con el motivo como texto. */
  deshabilitada?: string;
};

type Props = {
  /** Nombre del registro: es el título de la hoja y la etiqueta del botón ⋮. */
  titulo: string;
  etiqueta: string;
  acciones: Accion[];
};

const item =
  "flex min-h-touch w-full items-center gap-sm rounded-control px-md text-left text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground [&_svg]:size-icono [&_svg]:shrink-0";

/** Menú ⋮: hoja inferior en el móvil y menú flotante en tablet y computador (DESIGN.md §3). */
export function MenuAcciones({ titulo, etiqueta, acciones }: Props) {
  const esMovil = useEsMovil();
  const [abierta, setAbierta] = useState(false);
  const normales = acciones.filter((a) => !a.destructiva);
  const destructivas = acciones.filter((a) => a.destructiva);

  const disparador = (
    <Button variant="ghost" size="icon" aria-label={etiqueta}>
      <EllipsisVertical aria-hidden="true" />
    </Button>
  );

  if (esMovil) {
    const elegir = (accion: Accion) => {
      setAbierta(false);
      accion.alElegir();
    };
    const fila = (a: Accion) => (
      <li key={a.clave}>
        <button
          type="button"
          className={cn(item, a.destructiva && !a.deshabilitada && "text-destructive")}
          disabled={Boolean(a.deshabilitada)}
          onClick={() => elegir(a)}
        >
          {a.icono}
          <span className="flex flex-col">
            {a.etiqueta}
            {a.deshabilitada && <span className="text-body-sm">{a.deshabilitada}</span>}
          </span>
        </button>
      </li>
    );
    return (
      <Drawer open={abierta} onOpenChange={setAbierta}>
        <DrawerTrigger asChild>{disparador}</DrawerTrigger>
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>{titulo}</DrawerTitle>
          </DrawerHeader>
          <ul className="flex flex-col px-sm pb-md">
            {normales.map(fila)}
            {destructivas.length > 0 && <li aria-hidden="true" className="my-xs h-px bg-border" />}
            {destructivas.map(fila)}
          </ul>
        </DrawerContent>
      </Drawer>
    );
  }

  const opcion = (a: Accion) => (
    <DropdownMenuItem
      key={a.clave}
      variant={a.destructiva ? "destructive" : "default"}
      disabled={Boolean(a.deshabilitada)}
      onSelect={a.alElegir}
    >
      {a.icono}
      <span className="flex flex-col">
        {a.etiqueta}
        {a.deshabilitada && <span className="text-body-sm">{a.deshabilitada}</span>}
      </span>
    </DropdownMenuItem>
  );
  return (
    // Sin modo modal: el modal oculta el resto con aria-hidden y deja botones enfocables ahí (axe).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{disparador}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {normales.map(opcion)}
        {destructivas.length > 0 && <DropdownMenuSeparator />}
        {destructivas.map(opcion)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

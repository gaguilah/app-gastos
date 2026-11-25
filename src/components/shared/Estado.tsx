import type { ReactNode } from "react";
import { CircleAlert, RotateCw, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PropsEstado = {
  Icono: LucideIcon;
  titulo: string;
  mensaje?: string;
  /** La acción principal (vacío) o Reintentar (error). */
  children?: ReactNode;
  className?: string;
  role?: "alert";
  /** Si el estado es toda la pantalla, su título es el h1. */
  etiquetaTitulo?: "p" | "h1" | "h2";
};

/** Estado de una pantalla o lista: ícono, título, qué hacer y la acción (DESIGN.md §4 y §6). */
export function Estado({
  Icono,
  titulo,
  mensaje,
  children,
  className,
  role,
  etiquetaTitulo: Titulo = "p",
}: PropsEstado) {
  return (
    <div
      role={role}
      className={cn(
        "flex w-full flex-col items-center gap-sm rounded-card border bg-card p-xl text-center",
        className,
      )}
    >
      <Icono className="size-icono-estado text-muted-foreground" aria-hidden="true" />
      <Titulo className="text-headline-sm">{titulo}</Titulo>
      {mensaje && <p className="text-body-md text-muted-foreground">{mensaje}</p>}
      {children && <div className="mt-sm">{children}</div>}
    </div>
  );
}

/** Error al cargar: dice qué pasó y ofrece Reintentar. */
export function EstadoError({
  mensaje,
  alReintentar,
}: {
  mensaje?: string;
  alReintentar: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Estado
      Icono={CircleAlert}
      titulo={t("estado.error.titulo")}
      mensaje={mensaje ?? t("estado.error.mensaje")}
      role="alert"
      className="[&>svg]:text-destructive"
    >
      <Button variant="secondary" onClick={alReintentar}>
        <RotateCw aria-hidden="true" />
        {t("estado.error.reintentar")}
      </Button>
    </Estado>
  );
}

/** Carga: esqueletos con la forma de una lista de filas. */
export function EstadoCarga({ filas = 3 }: { filas?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex w-full flex-col gap-sm" aria-busy="true">
      <span className="sr-only">{t("app.cargando")}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-sm rounded-card border bg-card p-md">
          <Skeleton className="size-xl shrink-0" />
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton className="h-md w-1/2" />
            <Skeleton className="h-sm w-1/3" />
          </div>
          <Skeleton className="h-md w-xl" />
        </div>
      ))}
    </div>
  );
}

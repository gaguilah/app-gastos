import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón principal del formulario. Cargando: ícono girando, deshabilitado y con texto (DESIGN.md §4). */
export function BotonEnviar({
  enviando,
  textoEnviando,
  children,
}: {
  enviando: boolean;
  textoEnviando: string;
  children: ReactNode;
}) {
  return (
    <Button type="submit" className="min-h-campo w-full" disabled={enviando} aria-busy={enviando}>
      {enviando ? (
        <>
          <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {textoEnviando}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

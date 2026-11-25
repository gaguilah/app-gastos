import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnLinea } from "@/lib/useEnLinea";

/**
 * Botón principal del formulario. Cargando: ícono girando, deshabilitado y con texto (DESIGN.md §4).
 * Sin red se deshabilita: la franja «Sin conexión» explica por qué.
 */
export function BotonEnviar({
  enviando,
  textoEnviando,
  children,
}: {
  enviando: boolean;
  textoEnviando: string;
  children: ReactNode;
}) {
  const enLinea = useEnLinea();
  return (
    <Button
      type="submit"
      className="min-h-campo w-full"
      disabled={enviando || !enLinea}
      aria-busy={enviando}
    >
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

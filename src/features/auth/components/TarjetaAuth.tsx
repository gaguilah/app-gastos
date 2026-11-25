import type { ReactNode } from "react";
import { Wallet } from "lucide-react";

/** Tarjeta centrada del login y la recuperación (lienzo: LoginPC, LoginTablet, Main). Sin navegación. */
export function TarjetaAuth({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-pagina-movil pt-[max(var(--spacing-xl),var(--margen-muesca))] pb-xl md:items-center md:px-pagina-tablet">
      <div className="flex w-full max-w-tarjeta-auth flex-col gap-lg rounded-sheet border bg-card p-lg md:p-xl">
        <div className="flex flex-col gap-md">
          <span className="flex size-campo items-center justify-center rounded-card bg-primary text-primary-foreground">
            <Wallet className="size-icono-nav" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-xs">
            <h1 className="text-headline-md">{titulo}</h1>
            <p className="text-body-md text-muted-foreground">{ayuda}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

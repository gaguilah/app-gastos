import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { useEsMovil } from "@/lib/useEsMovil";
import { listaMas } from "./navegacion";

/** «Más» (solo móvil): en tablet y computador el menú lateral ya muestra estos destinos. */
export function Mas() {
  const { t } = useTranslation();
  if (!useEsMovil()) return <Navigate to="/" replace />;

  return (
    <main className="flex flex-col gap-md p-pagina-movil">
      <h1 className="text-headline-lg-movil">{t("nav.mas")}</h1>
      <nav aria-label={t("nav.mas")} className="rounded-card border bg-card px-md">
        <ul className="flex flex-col divide-y divide-muted">
          {listaMas.map(({ ruta, titulo, Icono }) => (
            <li key={ruta}>
              <Link
                to={ruta}
                className="flex min-h-touch items-center gap-sm py-sm text-title outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icono className="size-icono shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{t(titulo)}</span>
                <ChevronRight className="size-icono text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

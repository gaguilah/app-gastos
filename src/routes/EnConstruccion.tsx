import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";
import type { DatosRuta } from "./router";

/** Pantalla común de los módulos que llegan en etapas siguientes. */
export function EnConstruccion() {
  const { t } = useTranslation();
  const titulo = (useMatches().at(-1)?.handle as DatosRuta | undefined)?.titulo ?? "app.nombre";
  return (
    <main className="flex flex-col items-start gap-md p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <h1 className="text-headline-md xl:text-headline-lg">{t(titulo)}</h1>
      <div className="flex w-full flex-col items-center gap-sm rounded-card border bg-card p-xl text-center">
        <Construction className="size-icono-estado text-muted-foreground" aria-hidden="true" />
        <p className="text-headline-sm">{t("construccion.titulo")}</p>
        <p className="text-body-md text-muted-foreground">{t("construccion.mensaje")}</p>
      </div>
    </main>
  );
}

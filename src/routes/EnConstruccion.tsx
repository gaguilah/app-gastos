import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";
import { Estado } from "@/components/shared/Estado";
import type { DatosRuta } from "./router";

/** Pantalla común de los módulos que llegan en etapas siguientes. */
export function EnConstruccion() {
  const { t } = useTranslation();
  const titulo = (useMatches().at(-1)?.handle as DatosRuta | undefined)?.titulo ?? "app.nombre";
  return (
    <main className="flex flex-col items-start gap-md p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <h1 className="text-headline-lg-movil xl:text-headline-lg">{t(titulo)}</h1>
      <Estado
        Icono={Construction}
        titulo={t("construccion.titulo")}
        mensaje={t("construccion.mensaje")}
      />
    </main>
  );
}

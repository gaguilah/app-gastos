import { MapPinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Estado } from "@/components/shared/Estado";

export function NoEncontrada() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-col gap-md p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <Estado
        etiquetaTitulo="h1"
        Icono={MapPinOff}
        titulo={t("noEncontrada.titulo")}
        mensaje={t("noEncontrada.mensaje")}
      >
        <Button asChild>
          <Link to="/">{t("noEncontrada.irInicio")}</Link>
        </Button>
      </Estado>
    </main>
  );
}

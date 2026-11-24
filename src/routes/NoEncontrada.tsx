import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NoEncontrada() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-col items-center gap-md p-xl text-center">
      <h1 className="text-headline-md">{t("noEncontrada.titulo")}</h1>
      <p className="text-body-md text-muted-foreground">{t("noEncontrada.mensaje")}</p>
      <Button asChild>
        <Link to="/">{t("noEncontrada.irInicio")}</Link>
      </Button>
    </main>
  );
}

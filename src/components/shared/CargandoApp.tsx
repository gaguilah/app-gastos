import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Pantalla breve mientras se verifica la sesión o carga una pantalla diferida. */
export function CargandoApp() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">
      <LoaderCircle
        className="size-icono-estado animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="sr-only">{t("app.cargando")}</span>
    </div>
  );
}

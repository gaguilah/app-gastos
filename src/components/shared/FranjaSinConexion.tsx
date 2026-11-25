import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { useEnLinea } from "@/lib/useEnLinea";

/** Franja fija arriba de cualquier pantalla mientras no hay red (DESIGN.md §4 y §6). */
export function FranjaSinConexion() {
  const { t } = useTranslation();
  // La región viva queda siempre montada para que el lector de pantalla anuncie el cambio.
  const enLinea = useEnLinea();
  return (
    <div aria-live="polite" className="sticky top-0 z-40">
      {!enLinea && (
        <Alert
          variant="offline"
          role="none"
          data-franja-sin-conexion=""
          className="items-center pt-[max(var(--spacing-sm),env(safe-area-inset-top))]"
        >
          <WifiOff aria-hidden="true" />
          <span>
            <strong className="font-semibold">{t("avisos.sinConexion.titulo")}</strong>{" "}
            {t("avisos.sinConexion.mensaje")}
          </span>
        </Alert>
      )}
    </div>
  );
}

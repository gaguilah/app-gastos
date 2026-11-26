import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { claveErrorDatos } from "@/datos/errores";

/** Error de una mutación, traducido; nunca el texto crudo del servidor. */
export function AvisoError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Alert variant="error">
      <CircleAlert aria-hidden="true" />
      <p>{t(claveErrorDatos(error))}</p>
    </Alert>
  );
}

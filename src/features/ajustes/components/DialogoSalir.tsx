import { useState } from "react";
import { CircleAlert, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { supabase } from "@/datos/supabase";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useEnLinea } from "@/lib/useEnLinea";
import { Ventana } from "./Ventana";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void };

/** Confirma antes de cerrar la sesión de este dispositivo. */
export function DialogoSalir({ abierta, alCambiar }: Props) {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const enLinea = useEnLinea();
  const [saliendo, setSaliendo] = useState(false);
  const [fallo, setFallo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    setFallo(false);
    // "local": solo este dispositivo; las otras sesiones abiertas siguen igual.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setSaliendo(false);
    if (error) return setFallo(true);
    // replace: el botón Atrás no vuelve a una pantalla protegida.
    void navegar("/login", { replace: true });
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={(valor) => {
        setFallo(false);
        alCambiar(valor);
      }}
      rol="alertdialog"
      titulo={t("ajustes.cerrarSesionPregunta")}
      descripcion={t("ajustes.cerrarSesionMensaje")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={salir} disabled={saliendo || !enLinea}>
            <LogOut aria-hidden="true" />
            {t("ajustes.cerrarSesion")}
          </Button>
        </>
      }
    >
      {fallo && (
        <Alert variant="error">
          <CircleAlert aria-hidden="true" />
          <span>{t("ajustes.cerrarSesionError")}</span>
        </Alert>
      )}
    </Ventana>
  );
}

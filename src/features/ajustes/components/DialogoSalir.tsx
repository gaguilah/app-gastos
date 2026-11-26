import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { supabase } from "@/datos/supabase";
import { Button } from "@/components/ui/button";
import { Ventana } from "@/components/shared/Ventana";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void };

/** Confirma antes de cerrar la sesión de este dispositivo. */
export function DialogoSalir({ abierta, alCambiar }: Props) {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    // "local": solo este dispositivo. supabase-js borra la sesión guardada antes de avisar al
    // servidor, así que funciona sin red y aunque el servidor falle: no hay error que mostrar.
    await supabase.auth.signOut({ scope: "local" });
    // replace: el botón Atrás no vuelve a una pantalla protegida.
    void navegar("/login", { replace: true });
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      rol="alertdialog"
      titulo={t("ajustes.cerrarSesionPregunta")}
      descripcion={t("ajustes.cerrarSesionMensaje")}
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button variant="destructive" onClick={salir} disabled={saliendo}>
            <LogOut aria-hidden="true" />
            {t("ajustes.cerrarSesion")}
          </Button>
        </>
      }
    />
  );
}

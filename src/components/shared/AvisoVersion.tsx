import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

const CADA_HORA = 60 * 60 * 1000;

/**
 * Aviso flotante de versión nueva. La app nunca se actualiza sola: así no se pierde lo que
 * se esté escribiendo. Se actualiza cuando la persona toca Actualizar.
 */
export function AvisoVersion() {
  const { t } = useTranslation();
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    // La app puede quedar abierta días en el móvil: se revisa cada hora si hay versión nueva.
    onRegisteredSW: (_url, registro) => {
      if (registro) setInterval(() => void registro.update(), CADA_HORA);
    },
    // La recarga la hace `actualizar`: la del plugin no ocurre si la página se abrió por
    // primera vez, sin service worker todavía.
    onNeedReload: () => {},
  });

  const actualizar = useCallback(() => {
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
      once: true,
    });
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  useEffect(() => {
    if (!hayVersionNueva) return;
    // Mismo id: al cambiar el idioma se reemplaza el aviso en vez de duplicarlo.
    toast(t("avisos.version.titulo"), {
      id: "version-nueva",
      description: t("avisos.version.mensaje"),
      duration: Infinity,
      action: {
        label: t("avisos.version.actualizar"),
        onClick: actualizar,
      },
    });
  }, [hayVersionNueva, t, actualizar]);

  return null;
}

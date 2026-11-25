import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AvisoVersion } from "@/components/shared/AvisoVersion";
import { FranjaSinConexion } from "@/components/shared/FranjaSinConexion";

/** Raíz de todas las pantallas, públicas y protegidas: aquí viven los avisos globales. */
export function RaizApp() {
  const { t } = useTranslation();
  return (
    <>
      <FranjaSinConexion />
      <Outlet />
      <Toaster
        containerAriaLabel={t("avisos.region")}
        // En el móvil, el aviso queda encima de la barra inferior.
        mobileOffset={{
          bottom: "calc(var(--spacing-bnav) + var(--spacing-md) + env(safe-area-inset-bottom))",
        }}
      />
      <AvisoVersion />
    </>
  );
}

import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AvisoVersion } from "@/components/shared/AvisoVersion";
import { FranjaSinConexion } from "@/components/shared/FranjaSinConexion";

/** Raíz de todas las pantallas, públicas y protegidas: aquí viven los avisos globales. */
export function RaizApp() {
  return (
    <>
      <FranjaSinConexion />
      <Outlet />
      <Toaster
        // En el móvil, el aviso queda encima de la barra inferior.
        mobileOffset={{
          bottom: "calc(var(--spacing-bnav) + var(--spacing-md) + env(safe-area-inset-bottom))",
        }}
      />
      <AvisoVersion />
    </>
  );
}

import { Suspense } from "react";
import { Menu, Plus, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CargandoApp } from "@/components/shared/CargandoApp";
import { barraInferior, listaMas, menuLateral } from "./navegacion";

// Clase fija (no función): el Slot del tooltip no combina funciones. El activo se marca con
// aria-current="page", que NavLink pone solo.
const claseItemLateral = cn(
  "flex min-h-touch min-w-0 items-center gap-sm rounded-control px-sm text-body-md font-medium text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
  "md:max-xl:size-campo md:max-xl:justify-center md:max-xl:px-0",
  "aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground",
);

/** Menú lateral: plegado de 72 px con tooltips en tablet, fijo de 256 px en computador. */
function MenuLateral() {
  const { t } = useTranslation();
  return (
    <aside className="sticky top-0 hidden h-dvh w-sidebar-mini shrink-0 flex-col items-center gap-lg overflow-y-auto border-r bg-card px-sm pt-[max(var(--spacing-md),env(safe-area-inset-top))] pb-md md:flex xl:w-sidebar xl:items-stretch xl:px-md xl:pt-[max(var(--spacing-lg),env(safe-area-inset-top))]">
      <div className="flex items-center gap-sm">
        <span className="flex size-xl items-center justify-center rounded-control bg-primary text-primary-foreground">
          <Wallet className="size-icono" aria-hidden="true" />
        </span>
        <span className="hidden text-headline-sm xl:inline">{t("app.nombre")}</span>
      </div>
      <nav aria-label={t("nav.principal")} className="flex flex-1 flex-col gap-xs xl:w-full">
        {menuLateral.map(({ ruta, etiqueta, Icono }) => (
          <Tooltip key={ruta}>
            <TooltipTrigger asChild>
              <NavLink to={ruta} end className={claseItemLateral}>
                <Icono className="size-icono-nav shrink-0" aria-hidden="true" />
                <span className="truncate md:max-xl:sr-only">{t(etiqueta)}</span>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="xl:hidden">
              {t(etiqueta)}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/gastos/nuevo"
            className="flex min-h-touch items-center justify-center gap-sm rounded-control bg-primary text-title text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:max-xl:size-campo xl:px-md"
          >
            <Plus className="size-icono shrink-0" aria-hidden="true" />
            <span className="md:max-xl:sr-only">{t("nav.registrarGasto")}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="xl:hidden">
          {t("nav.registrarGasto")}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}

const claseItemInferior = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex min-h-touch flex-col items-center justify-end gap-xs rounded-control pb-xs text-label-tag text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive && "text-primary",
  );

/** Barra inferior del móvil: Inicio, Gastos, + Registrar (flotante), Reportes y Más. */
function BarraInferior() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // «Más» queda activo también en los destinos que se abren desde su lista.
  const enMas = pathname === "/mas" || listaMas.some((i) => pathname.startsWith(i.ruta));
  const [inicio, gastos, reportes] = barraInferior;

  const enlace = (i: (typeof barraInferior)[number]) => (
    <NavLink key={i.ruta} to={i.ruta} end className={claseItemInferior}>
      <i.Icono className="size-icono-nav" aria-hidden="true" />
      {t(i.etiqueta)}
    </NavLink>
  );

  return (
    <nav
      aria-label={t("nav.principal")}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card px-sm pt-xs pb-[calc(var(--spacing-sm)+env(safe-area-inset-bottom))] md:hidden"
    >
      {inicio && enlace(inicio)}
      {gastos && enlace(gastos)}
      <NavLink to="/gastos/nuevo" end className={claseItemInferior}>
        <span className="-mt-lg flex size-fab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab">
          <Plus className="size-icono-nav" aria-hidden="true" />
        </span>
        {t("nav.registrar")}
      </NavLink>
      {reportes && enlace(reportes)}
      <Link
        to="/mas"
        className={claseItemInferior({ isActive: enMas })}
        aria-current={enMas ? "page" : undefined}
      >
        <Menu className="size-icono-nav" aria-hidden="true" />
        {t("nav.mas")}
      </Link>
    </nav>
  );
}

/** Layout común de todas las pantallas con sesión (DESIGN.md §3). */
export function LayoutApp() {
  return (
    <TooltipProvider>
      <div className="flex min-h-dvh">
        <MenuLateral />
        <div className="min-w-0 flex-1 pt-[env(safe-area-inset-top)] pb-[calc(var(--spacing-bnav)+env(safe-area-inset-bottom))] md:pb-0">
          <Suspense fallback={<CargandoApp />}>
            <Outlet />
          </Suspense>
        </div>
        <BarraInferior />
      </div>
    </TooltipProvider>
  );
}

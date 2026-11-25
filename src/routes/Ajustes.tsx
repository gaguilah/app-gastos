import { useState, type ReactNode } from "react";
import { ChevronRight, Globe, Info, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSesion } from "@/features/auth/useSesion";
import { DialogoIdioma } from "@/features/ajustes/components/DialogoIdioma";
import { DialogoSalir } from "@/features/ajustes/components/DialogoSalir";
import type { Idioma } from "@/i18n";

const claseIcono =
  "flex size-xl shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground";

function Fila({
  icono,
  titulo,
  detalle,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  detalle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    // span y no div: la fila también va dentro de un botón, que solo admite contenido de frase.
    <span className="flex min-h-touch items-center gap-sm px-md py-sm">
      <span className={claseIcono}>{icono}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-title">{titulo}</span>
        {detalle && <span className="truncate text-body-sm text-muted-foreground">{detalle}</span>}
      </span>
      {children}
    </span>
  );
}

/** Ajustes: idioma, cuenta, versión y cerrar sesión (DESIGN.md §9, Etapa 4). */
export function Ajustes() {
  const { t, i18n } = useTranslation();
  const { sesion } = useSesion();
  const [abierta, setAbierta] = useState<"idioma" | "salir" | null>(null);
  const idioma = i18n.language as Idioma;
  const alCambiar = (cual: "idioma" | "salir") => (valor: boolean) =>
    setAbierta(valor ? cual : null);

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("nav.ajustes")}</h1>

      <section className="flex flex-col divide-y divide-muted overflow-hidden rounded-card border bg-card">
        <button
          type="button"
          onClick={() => setAbierta("idioma")}
          aria-haspopup="dialog"
          className="text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Fila
            icono={<Globe className="size-icono" aria-hidden="true" />}
            titulo={t("ajustes.idioma")}
            detalle={t(`ajustes.nombreIdioma.${idioma}`)}
          >
            <span className="sr-only">{t("ajustes.cambiarIdioma")}</span>
            <ChevronRight className="size-icono text-muted-foreground" aria-hidden="true" />
          </Fila>
        </button>
        <Fila
          icono={<UserRound className="size-icono" aria-hidden="true" />}
          titulo={t("ajustes.cuenta")}
          detalle={sesion?.user.email}
        />
        {/* Fila propia: al lado del correo, el botón lo recortaba en el móvil. */}
        <button
          type="button"
          onClick={() => setAbierta("salir")}
          aria-haspopup="dialog"
          className="flex min-h-touch items-center gap-sm px-md py-sm text-left text-title text-destructive outline-none hover:bg-destructive-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className="flex size-xl shrink-0 items-center justify-center rounded-control bg-destructive-soft">
            <LogOut className="size-icono" aria-hidden="true" />
          </span>
          {t("ajustes.cerrarSesion")}
        </button>
      </section>

      <section aria-labelledby="ajustes-aplicacion" className="flex flex-col gap-sm">
        <h2 id="ajustes-aplicacion" className="text-label-tag text-muted-foreground uppercase">
          {t("ajustes.aplicacion")}
        </h2>
        <div className="rounded-card border bg-card">
          <Fila
            icono={<Info className="size-icono" aria-hidden="true" />}
            titulo={t("ajustes.version")}
          >
            <span className="font-mono text-label-numeric">{__VERSION_APP__}</span>
          </Fila>
        </div>
      </section>

      <DialogoIdioma
        abierta={abierta === "idioma"}
        alCambiar={alCambiar("idioma")}
        actual={idioma}
      />
      <DialogoSalir abierta={abierta === "salir"} alCambiar={alCambiar("salir")} />
    </main>
  );
}

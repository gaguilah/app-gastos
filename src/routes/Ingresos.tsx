import { useState } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Estado, EstadoCarga, EstadoError } from "@/components/shared/Estado";
import { totalesIngresos, useIngresos, type Ingreso } from "@/datos/ingresos";
import { periodoEnCurso, usePresupuesto } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";
import { diaBogota, rangoPeriodo } from "@/dominio/fechas";
import { DialogoDetalleIngreso } from "@/features/ingresos/components/DialogoDetalleIngreso";
import { DialogoEliminarIngreso } from "@/features/ingresos/components/DialogoEliminarIngreso";
import { FormularioIngreso } from "@/features/ingresos/components/FormularioIngreso";
import { ListaIngresos, type AccionIngreso } from "@/features/ingresos/components/ListaIngresos";
import { cn } from "@/lib/utils";

type Abierta =
  { accion: "nuevo"; destino?: string } | { accion: AccionIngreso; ingreso: Ingreso } | null;

/** Ingresos del período elegido, con sus totales y su destino (3.5). */
export function Ingresos() {
  const { t, i18n } = useTranslation();
  const hoy = diaBogota(new Date());
  const presupuesto = usePresupuesto();
  const periodos = presupuesto.data?.periodos ?? [];
  const [elegido, setElegido] = useState<string | null>(null);
  const periodo =
    periodos.find((p) => p.id === elegido) ?? periodoEnCurso(periodos, hoy) ?? periodos[0];
  const indice = periodo ? periodos.indexOf(periodo) : -1;
  const consulta = useIngresos(periodo?.inicio, periodo?.fin);

  // «Recargar → Ingreso nuevo» llega con ?nuevo=1&destino=<bolsa>.
  const [parametros, setParametros] = useSearchParams();
  const [abierta, setAbierta] = useState<Abierta>(() =>
    parametros.get("nuevo")
      ? { accion: "nuevo", destino: parametros.get("destino") ?? undefined }
      : null,
  );
  const cerrar = (valor: boolean) => {
    if (valor) return;
    setAbierta(null);
    if (parametros.size) setParametros({}, { replace: true });
  };
  const nuevo = () => setAbierta({ accion: "nuevo" });

  const ingresos = consulta.data ?? [];
  const totales = totalesIngresos(ingresos);
  const cargando = presupuesto.isPending || (Boolean(periodo) && consulta.isPending);
  const conError = presupuesto.isError || consulta.isError;
  const reintentar = () => void (presupuesto.isError ? presupuesto.refetch() : consulta.refetch());

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("ingresos.titulo")}</h1>
          {periodo && (
            <div className="flex items-center gap-xs">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("ingresos.anterior")}
                disabled={indice >= periodos.length - 1}
                onClick={() => setElegido(periodos[indice + 1]!.id)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <p className="text-body-md text-muted-foreground" aria-live="polite">
                {consulta.data
                  ? t("ingresos.resumenPeriodo", {
                      rango: rangoPeriodo(periodo.inicio, periodo.fin, i18n.language),
                      count: ingresos.length,
                    })
                  : rangoPeriodo(periodo.inicio, periodo.fin, i18n.language)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("ingresos.siguiente")}
                disabled={indice <= 0}
                onClick={() => setElegido(periodos[indice - 1]!.id)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        <Button onClick={nuevo}>
          <Plus aria-hidden="true" />
          {t("ingresos.registrar")}
        </Button>
      </header>

      {cargando ? (
        <EstadoCarga filas={3} />
      ) : conError ? (
        <EstadoError mensaje={t("ingresos.errorMensaje")} alReintentar={reintentar} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-sm md:grid-cols-3">
            {(
              [
                ["total", totales.total],
                ["presupuesto", totales.presupuesto],
                ["bolsas", totales.bolsas],
              ] as const
            ).map(([clave, valor]) => (
              <div
                key={clave}
                className={cn(
                  "flex flex-col gap-xs rounded-card border bg-card p-md",
                  clave === "total" && "col-span-2 md:col-span-1",
                )}
              >
                <h2 className="text-body-sm text-muted-foreground">{t(`ingresos.kpi.${clave}`)}</h2>
                <p
                  className={cn(
                    "font-mono text-amount-kpi tabular-nums",
                    valor > 0 && "text-success",
                  )}
                >
                  {formatearPesos(valor, { signo: true })}
                </p>
              </div>
            ))}
          </section>
          {ingresos.length === 0 ? (
            <Estado
              Icono={HandCoins}
              titulo={t("ingresos.vacio.titulo")}
              mensaje={t("ingresos.vacio.mensaje")}
            >
              <Button onClick={nuevo}>
                <Plus aria-hidden="true" />
                {t("ingresos.registrar")}
              </Button>
            </Estado>
          ) : (
            <ListaIngresos
              ingresos={ingresos}
              hoy={hoy}
              alElegir={(accion, ingreso) => setAbierta({ accion, ingreso })}
            />
          )}
        </>
      )}

      {abierta?.accion === "nuevo" && (
        <FormularioIngreso abierta alCambiar={cerrar} hoy={hoy} destinoInicial={abierta.destino} />
      )}
      {abierta?.accion === "editar" && (
        <FormularioIngreso
          abierta
          alCambiar={cerrar}
          hoy={hoy}
          ingreso={abierta.ingreso}
          alEliminar={() => setAbierta({ accion: "eliminar", ingreso: abierta.ingreso })}
        />
      )}
      {abierta?.accion === "detalle" && (
        <DialogoDetalleIngreso
          abierta
          alCambiar={cerrar}
          ingreso={abierta.ingreso}
          alEditar={() => setAbierta({ accion: "editar", ingreso: abierta.ingreso })}
        />
      )}
      {abierta?.accion === "eliminar" && (
        <DialogoEliminarIngreso abierta alCambiar={cerrar} ingreso={abierta.ingreso} />
      )}
    </main>
  );
}

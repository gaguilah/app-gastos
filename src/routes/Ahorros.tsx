import { useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Estado, EstadoCarga, EstadoError } from "@/components/shared/Estado";
import {
  useAportesPeriodo,
  useMetas,
  usePendientes,
  useReanudarMeta,
  type Meta,
  type Pendiente,
} from "@/datos/ahorros";
import { claveErrorDatos } from "@/datos/errores";
import { periodoEnCurso, usePresupuesto } from "@/datos/presupuesto";
import { formatearPesos } from "@/dominio/dinero";
import { diaBogota } from "@/dominio/fechas";
import { DialogoAporte } from "@/features/ahorros/components/DialogoAporte";
import { DialogoConfirmarAporte } from "@/features/ahorros/components/DialogoConfirmarAporte";
import { DialogoDetalleMeta } from "@/features/ahorros/components/DialogoDetalleMeta";
import { DialogoEliminarMeta } from "@/features/ahorros/components/DialogoEliminarMeta";
import { DialogoOmitirAporte } from "@/features/ahorros/components/DialogoOmitirAporte";
import { DialogoPausarMeta } from "@/features/ahorros/components/DialogoPausarMeta";
import { DialogoRetiro } from "@/features/ahorros/components/DialogoRetiro";
import { FormularioMeta } from "@/features/ahorros/components/FormularioMeta";
import { ListaMetas, type AccionMeta } from "@/features/ahorros/components/ListaMetas";
import { TarjetaPendientes } from "@/features/ahorros/components/TarjetaPendientes";
import { cn } from "@/lib/utils";

type Abierta =
  | { accion: "nueva" }
  | { accion: Exclude<AccionMeta, "reanudar">; meta: Meta }
  | { accion: "ajustar" | "omitir"; pendiente: Pendiente }
  | null;

/** Metas de ahorro: total, aportes del período, pendientes por confirmar y metas (3.15). */
export function Ahorros() {
  const { t } = useTranslation();
  const metas = useMetas();
  const pendientes = usePendientes();
  const presupuesto = usePresupuesto();
  const reanudar = useReanudarMeta();
  const hoy = diaBogota(new Date());
  const periodo = periodoEnCurso(presupuesto.data?.periodos ?? [], hoy);
  const aportes = useAportesPeriodo(periodo?.inicio, periodo?.fin);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const nueva = () => setAbierta({ accion: "nueva" });

  const lista = metas.data ?? [];
  const porConfirmar = pendientes.data ?? [];
  // La meta abierta se lee de la consulta para que el detalle refleje los cambios al guardar.
  const metaAbierta =
    abierta && "meta" in abierta
      ? (lista.find((m) => m.id === abierta.meta.id) ?? abierta.meta)
      : null;

  const elegir = (accion: AccionMeta, meta: Meta) => {
    if (accion !== "reanudar") return setAbierta({ accion, meta });
    reanudar.mutate(meta.id, {
      onSuccess: () => toast.success(t("ahorros.avisos.reanudada")),
      onError: (error) => toast.error(t(claveErrorDatos(error))),
    });
  };

  const kpis = [
    ["total", lista.reduce((suma, m) => suma + m.saldo, 0)],
    ["periodo", aportes.data ?? 0],
    ["porConfirmar", porConfirmar.reduce((suma, p) => suma + p.valor, 0)],
  ] as const;

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("ahorros.titulo")}</h1>
          <p className="text-body-md text-muted-foreground">{t("ahorros.descripcion")}</p>
        </div>
        <Button onClick={nueva}>
          <Plus aria-hidden="true" />
          {t("ahorros.nueva")}
        </Button>
      </header>

      {metas.isPending ? (
        <EstadoCarga filas={3} />
      ) : metas.isError ? (
        <EstadoError
          mensaje={t("ahorros.errorMensaje")}
          alReintentar={() => void metas.refetch()}
        />
      ) : lista.length === 0 ? (
        <Estado
          Icono={PiggyBank}
          titulo={t("ahorros.vacio.titulo")}
          mensaje={t("ahorros.vacio.mensaje")}
        >
          <Button onClick={nueva}>
            <Plus aria-hidden="true" />
            {t("ahorros.vacio.crear")}
          </Button>
        </Estado>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-sm md:grid-cols-3">
            {kpis.map(([clave, valor]) => (
              <div
                key={clave}
                className={cn(
                  "flex flex-col gap-xs rounded-card border bg-card p-md",
                  clave === "total" && "col-span-2 md:col-span-1",
                )}
              >
                <h2 className="text-body-sm text-muted-foreground">{t(`ahorros.kpi.${clave}`)}</h2>
                <p className="font-mono text-amount-kpi tabular-nums">{formatearPesos(valor)}</p>
              </div>
            ))}
          </section>
          {porConfirmar.length > 0 && (
            <TarjetaPendientes
              pendientes={porConfirmar}
              hoy={hoy}
              alAjustar={(pendiente) => setAbierta({ accion: "ajustar", pendiente })}
              alOmitir={(pendiente) => setAbierta({ accion: "omitir", pendiente })}
            />
          )}
          <section aria-labelledby="titulo-metas" className="flex flex-col gap-sm">
            <h2 id="titulo-metas" className="text-headline-sm">
              {t("ahorros.metas")}
            </h2>
            <ListaMetas metas={lista} hoy={hoy} alElegir={elegir} />
          </section>
        </>
      )}

      {abierta?.accion === "nueva" && <FormularioMeta abierta alCambiar={cerrar} hoy={hoy} />}
      {metaAbierta && abierta?.accion === "editar" && (
        <FormularioMeta abierta alCambiar={cerrar} hoy={hoy} meta={metaAbierta} />
      )}
      {metaAbierta && abierta?.accion === "detalle" && (
        <DialogoDetalleMeta
          abierta
          alCambiar={cerrar}
          meta={metaAbierta}
          hoy={hoy}
          alAportar={() => setAbierta({ accion: "aportar", meta: metaAbierta })}
          alRetirar={() => setAbierta({ accion: "retirar", meta: metaAbierta })}
        />
      )}
      {metaAbierta && abierta?.accion === "aportar" && (
        <DialogoAporte abierta alCambiar={cerrar} meta={metaAbierta} />
      )}
      {metaAbierta && abierta?.accion === "retirar" && (
        <DialogoRetiro abierta alCambiar={cerrar} meta={metaAbierta} />
      )}
      {metaAbierta && abierta?.accion === "pausar" && (
        <DialogoPausarMeta abierta alCambiar={cerrar} meta={metaAbierta} />
      )}
      {metaAbierta && abierta?.accion === "eliminar" && (
        <DialogoEliminarMeta abierta alCambiar={cerrar} meta={metaAbierta} />
      )}
      {abierta?.accion === "ajustar" && (
        <DialogoConfirmarAporte abierta alCambiar={cerrar} pendiente={abierta.pendiente} />
      )}
      {abierta?.accion === "omitir" && (
        <DialogoOmitirAporte abierta alCambiar={cerrar} pendiente={abierta.pendiente} />
      )}
    </main>
  );
}

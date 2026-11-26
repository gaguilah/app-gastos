import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EstadoCarga, EstadoError } from "@/components/shared/Estado";
import { periodoEnCurso, usePresupuesto, type Periodo } from "@/datos/presupuesto";
import { diaBogota } from "@/dominio/fechas";
import { DialogoAjustarPeriodo } from "@/features/presupuesto/components/DialogoAjustarPeriodo";
import { DialogoDiaInicio } from "@/features/presupuesto/components/DialogoDiaInicio";
import { DialogoPresupuestoDefecto } from "@/features/presupuesto/components/DialogoPresupuestoDefecto";
import { ListaPeriodos } from "@/features/presupuesto/components/ListaPeriodos";
import { TarjetaConfiguracion } from "@/features/presupuesto/components/TarjetaConfiguracion";

type Abierta = { accion: "dia" } | { accion: "defecto" } | { accion: "ajustar"; periodo: Periodo };

/** Día de inicio, presupuesto por defecto y lista de períodos con su uso (3.1, 3.2). */
export function Presupuesto() {
  const { t } = useTranslation();
  const consulta = usePresupuesto();
  const [abierta, setAbierta] = useState<Abierta | null>(null);
  const hoy = diaBogota(new Date());
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const datos = consulta.data;
  const enCurso = datos && periodoEnCurso(datos.periodos, hoy);

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-col gap-xs">
        <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("presupuesto.titulo")}</h1>
        <p className="text-body-md text-muted-foreground">{t("presupuesto.descripcion")}</p>
      </header>

      {consulta.isPending ? (
        <EstadoCarga filas={4} />
      ) : consulta.isError ? (
        <EstadoError
          mensaje={t("presupuesto.errorMensaje")}
          alReintentar={() => void consulta.refetch()}
        />
      ) : (
        <>
          <TarjetaConfiguracion
            diaInicio={datos!.diaInicio}
            presupuestoDefecto={datos!.presupuestoDefecto}
            alCambiarDia={() => setAbierta({ accion: "dia" })}
            alCambiarDefecto={() => setAbierta({ accion: "defecto" })}
          />
          <section aria-labelledby="titulo-periodos" className="flex flex-col gap-md">
            <h2 id="titulo-periodos" className="text-headline-sm">
              {t("presupuesto.periodos")}
            </h2>
            <ListaPeriodos
              periodos={datos!.periodos}
              enCursoId={enCurso?.id}
              alAjustar={(periodo) => setAbierta({ accion: "ajustar", periodo })}
            />
          </section>
        </>
      )}

      {datos && abierta?.accion === "dia" && (
        <DialogoDiaInicio
          abierta
          alCambiar={cerrar}
          perfilId={datos.perfilId}
          diaActual={datos.diaInicio}
        />
      )}
      {datos && abierta?.accion === "defecto" && (
        <DialogoPresupuestoDefecto
          abierta
          alCambiar={cerrar}
          valorActual={datos.presupuestoDefecto}
          hayPeriodoEnCurso={Boolean(enCurso)}
        />
      )}
      {abierta?.accion === "ajustar" && (
        <DialogoAjustarPeriodo abierta alCambiar={cerrar} periodo={abierta.periodo} />
      )}
    </main>
  );
}

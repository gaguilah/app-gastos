import { useState } from "react";
import { Plus, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Estado, EstadoCarga, EstadoError } from "@/components/shared/Estado";
import { useBolsas, type Bolsa } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { diaBogota } from "@/dominio/fechas";
import { DialogoAjustarSaldo } from "@/features/bolsas/components/DialogoAjustarSaldo";
import { DialogoEliminarBolsa } from "@/features/bolsas/components/DialogoEliminarBolsa";
import { DialogoMovimientos } from "@/features/bolsas/components/DialogoMovimientos";
import { DialogoNuevaBolsa } from "@/features/bolsas/components/DialogoNuevaBolsa";
import { DialogoRecargar } from "@/features/bolsas/components/DialogoRecargar";
import { DialogoRenombrarBolsa } from "@/features/bolsas/components/DialogoRenombrarBolsa";
import { DialogoTrasladar } from "@/features/bolsas/components/DialogoTrasladar";
import { ListaBolsas, type AccionBolsa } from "@/features/bolsas/components/ListaBolsas";
import { cn } from "@/lib/utils";

type Abierta = { accion: "nueva" } | { accion: AccionBolsa; bolsa: Bolsa } | null;

/** Bolsas de dinero: saldo total, movimientos, recargas, traslados, ajustes y eliminar (3.4). */
export function Bolsas() {
  const { t } = useTranslation();
  const consulta = useBolsas();
  const [abierta, setAbierta] = useState<Abierta>(null);
  const hoy = diaBogota(new Date());
  const bolsas = consulta.data ?? [];
  const total = bolsas.reduce((suma, b) => suma + b.saldo, 0);
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const nueva = () => setAbierta({ accion: "nueva" });
  const otras = (b: Bolsa) => bolsas.filter((o) => o.id !== b.id);

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("bolsas.titulo")}</h1>
          <p className="text-body-md text-muted-foreground">{t("bolsas.descripcion")}</p>
        </div>
        <Button onClick={nueva}>
          <Plus aria-hidden="true" />
          {t("bolsas.nueva")}
        </Button>
      </header>

      {consulta.isPending ? (
        <EstadoCarga filas={3} />
      ) : consulta.isError ? (
        <EstadoError
          mensaje={t("bolsas.errorMensaje")}
          alReintentar={() => void consulta.refetch()}
        />
      ) : bolsas.length === 0 ? (
        <Estado
          Icono={WalletCards}
          titulo={t("bolsas.vacio.titulo")}
          mensaje={t("bolsas.vacio.mensaje")}
        >
          <Button onClick={nueva}>
            <Plus aria-hidden="true" />
            {t("bolsas.nuevaDialogo.crear")}
          </Button>
        </Estado>
      ) : (
        <>
          <section className="flex flex-col gap-xs rounded-card border bg-card p-md xl:p-lg">
            <h2 className="text-body-md text-muted-foreground">{t("bolsas.saldoTotal")}</h2>
            <p
              className={cn(
                "font-mono text-amount-xl tabular-nums",
                total < 0 && "text-warning-ink",
              )}
            >
              {formatearPesos(total)}
            </p>
          </section>
          <ListaBolsas
            bolsas={bolsas}
            hoy={hoy}
            alElegir={(accion, bolsa) => setAbierta({ accion, bolsa })}
          />
        </>
      )}

      {abierta?.accion === "nueva" && <DialogoNuevaBolsa abierta alCambiar={cerrar} />}
      {abierta?.accion === "movimientos" && (
        <DialogoMovimientos abierta alCambiar={cerrar} bolsa={abierta.bolsa} hoy={hoy} />
      )}
      {abierta?.accion === "recargar" && (
        <DialogoRecargar
          abierta
          alCambiar={cerrar}
          bolsa={abierta.bolsa}
          hayOtras={otras(abierta.bolsa).length > 0}
        />
      )}
      {abierta?.accion === "trasladar" && (
        <DialogoTrasladar abierta alCambiar={cerrar} bolsa={abierta.bolsa} bolsas={bolsas} />
      )}
      {abierta?.accion === "ajustar" && (
        <DialogoAjustarSaldo abierta alCambiar={cerrar} bolsa={abierta.bolsa} />
      )}
      {abierta?.accion === "renombrar" && (
        <DialogoRenombrarBolsa abierta alCambiar={cerrar} bolsa={abierta.bolsa} />
      )}
      {abierta?.accion === "eliminar" && (
        <DialogoEliminarBolsa
          abierta
          alCambiar={cerrar}
          bolsa={abierta.bolsa}
          otras={otras(abierta.bolsa)}
        />
      )}
    </main>
  );
}

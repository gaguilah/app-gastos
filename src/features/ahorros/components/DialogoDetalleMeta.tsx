import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoCarga } from "@/components/shared/Estado";
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { Ventana } from "@/components/shared/Ventana";
import type { Meta } from "@/datos/ahorros";
import { useMovimientosBolsa, type Movimiento } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { fechaCorta, fechaLarga, mesAnio } from "@/dominio/fechas";
import { cn } from "@/lib/utils";
import { avanceMeta, varianteEstadoMeta } from "../textos";
import { BarraMeta } from "./BarraMeta";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  meta: Meta;
  hoy: string;
  alAportar: () => void;
  alRetirar: () => void;
};

/** Detalle: avance contra el ritmo ideal, aporte, fecha final, proyección y movimientos. */
export function DialogoDetalleMeta({ abierta, alCambiar, meta, hoy, alAportar, alRetirar }: Props) {
  const { t, i18n } = useTranslation();
  const movimientos = useMovimientosBolsa(meta.bolsaId);
  const regla = meta.regla && !meta.regla.pausada ? meta.regla : null;
  const fecha = (d: string) => {
    const f = fechaCorta(d, hoy, i18n.language);
    return "clave" in f ? t(f.clave) : f.texto;
  };
  const titulo = (m: Movimiento) => m.titulo ?? t(`bolsas.movimiento.tipo.${m.tipo}`);
  const detalle = (m: Movimiento) =>
    m.contraparte
      ? `${fecha(m.fecha)} · ${t(m.valor > 0 ? "ahorros.detalle.desde" : "ahorros.detalle.a", { nombre: m.contraparte })}`
      : fecha(m.fecha);

  const filas = [
    [
      "aporte",
      regla
        ? t("ahorros.detalle.aporteTexto", {
            valor: formatearPesos(regla.valor),
            frecuencia: t(`ahorros.detalle.cada.${regla.frecuencia}`, { dia: regla.dia }),
            origen: regla.origenNombre,
          })
        : t("ahorros.sinAporte"),
    ],
    ["fechaFinal", fechaLarga(meta.fechaFinal, i18n.language)],
    [
      "proyeccion",
      meta.fechaProyectada
        ? t("ahorros.detalle.proyeccionTexto", {
            mes: mesAnio(meta.fechaProyectada, i18n.language),
          })
        : t("ahorros.detalle.sinProyeccion"),
    ],
  ] as const;

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("ahorros.detalle.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={alRetirar} disabled={meta.saldo <= 0}>
            {t("ahorros.acciones.retirar")}
          </Button>
          {meta.estado !== "cumplida" && (
            <Button onClick={alAportar}>{t("ahorros.acciones.aportar")}</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-md pb-md">
        <div className="flex items-center gap-md">
          <IconoCategoria
            icono={meta.icono}
            color={null}
            className="bg-accent text-accent-foreground"
          />
          <span className="min-w-0 flex-1 text-title">{meta.nombre}</span>
          <Badge variant={varianteEstadoMeta[meta.estado]}>
            {t(`ahorros.estado.${meta.estado}`)}
          </Badge>
        </div>
        <div className="flex flex-col gap-xs">
          <p className="font-mono text-amount-xl tabular-nums">{formatearPesos(meta.saldo)}</p>
          <p className="text-body-sm text-muted-foreground">
            {t("ahorros.detalle.faltan", {
              monto: formatearPesos(meta.monto),
              falta: formatearPesos(Math.max(meta.monto - meta.saldo, 0)),
            })}
          </p>
        </div>
        <BarraMeta saldo={meta.saldo} monto={meta.monto} ideal={meta.ritmoIdeal} />
        <p className="flex flex-wrap gap-md text-body-sm text-muted-foreground">
          <span>
            {t("ahorros.detalle.ahorrado")}:{" "}
            <span className="font-mono">{formatearPesos(meta.saldo)}</span> (
            {avanceMeta(meta.saldo, meta.monto)} %)
          </span>
          <span>
            {t("ahorros.detalle.ritmoIdeal")}:{" "}
            <span className="font-mono">{formatearPesos(meta.ritmoIdeal)}</span>
          </span>
        </p>
        <dl className="flex flex-col rounded-card border">
          {filas.map(([clave, texto]) => (
            <div key={clave} className="flex flex-col gap-xs border-t px-md py-sm first:border-t-0">
              <dt className="text-body-sm text-muted-foreground">
                {t(`ahorros.detalle.${clave}`)}
              </dt>
              <dd className="text-body-md">{texto}</dd>
            </div>
          ))}
        </dl>
        <h3 className="text-title">{t("ahorros.detalle.movimientos")}</h3>
        {movimientos.isPending ? (
          <EstadoCarga filas={2} />
        ) : !movimientos.data?.length ? (
          <p className="text-body-md text-muted-foreground">
            {t("ahorros.detalle.sinMovimientos")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {movimientos.data.map((m) => (
              <li
                key={`${m.tipo}-${m.id}`}
                className="flex items-center justify-between gap-md border-t py-sm first:border-t-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-body-md font-medium">{titulo(m)}</span>
                  <span className="text-body-sm text-muted-foreground">{detalle(m)}</span>
                </span>
                <span
                  className={cn(
                    "font-mono text-label-numeric tabular-nums",
                    m.valor > 0 && "text-success",
                  )}
                >
                  {formatearPesos(m.valor, { signo: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Ventana>
  );
}

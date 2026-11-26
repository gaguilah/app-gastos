import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorIconoColor } from "@/components/shared/SelectorIconoColor";
import { Ventana } from "@/components/shared/Ventana";
import {
  useCrearMeta,
  useEditarMeta,
  useSugerirAporte,
  type DatosMeta,
  type Frecuencia,
  type Meta,
} from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";
import { fechaCorta, fechaPorPlazo, type UnidadPlazo } from "@/dominio/fechas";
import { leerOrigen, valorOrigen } from "../textos";
import { SelectorOrigen } from "./SelectorOrigen";

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  hoy: string;
  /** Sin meta, el formulario crea una nueva. */
  meta?: Meta;
};

const frecuencias: Frecuencia[] = ["semanal", "quincenal", "mensual"];
const unidades: UnidadPlazo[] = ["dias", "semanas", "meses"];
const fila =
  "flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md text-body-md has-[[data-state=checked]]:border-primary";

/**
 * Nueva o editar meta (3.15): nombre, ícono, monto, plazo o fecha final, saldo inicial y aporte
 * periódico opcional, con el aporte sugerido y la fecha estimada antes de guardar (supuesto 20).
 */
export function FormularioMeta({ abierta, alCambiar, hoy, meta }: Props) {
  const { t, i18n } = useTranslation();
  const crear = useCrearMeta();
  const editar = useEditarMeta();
  const mutacion = meta ? editar : crear;
  const regla = meta?.regla && !meta.regla.pausada ? meta.regla : null;

  const [nombre, setNombre] = useState(meta?.nombre ?? "");
  const [icono, setIcono] = useState(meta?.icono ?? "piggy-bank");
  const [monto, setMonto] = useState<number | null>(meta?.monto ?? null);
  const [cantidad, setCantidad] = useState("12");
  const [unidad, setUnidad] = useState<UnidadPlazo>("meses");
  const [fechaFinal, setFechaFinal] = useState(meta?.fechaFinal ?? "");
  const [saldoInicial, setSaldoInicial] = useState<number | null>(null);
  const [periodicos, setPeriodicos] = useState(meta ? Boolean(regla) : true);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(regla?.frecuencia ?? "mensual");
  const [dia, setDia] = useState(String(regla?.dia ?? 1));
  // Hasta que se escribe, el valor del aporte sigue al sugerido (o al de la regla al editar).
  const [escrito, setEscrito] = useState<number | null | undefined>(regla?.valor);
  const [origen, setOrigen] = useState<string | null>(regla ? valorOrigen(regla) : null);
  const [afecta, setAfecta] = useState(regla?.afectaPresupuesto ?? false);
  const [intento, setIntento] = useState(false);

  const plazo = /^\d{1,4}$/.test(cantidad) ? Number(cantidad) : 0;
  const final = meta ? fechaFinal : plazo > 0 ? fechaPorPlazo(hoy, plazo, unidad) : null;
  const diaNumero = /^\d{1,2}$/.test(dia) ? Number(dia) : null;
  const diaValido =
    frecuencia === "semanal" || (diaNumero !== null && diaNumero >= 1 && diaNumero <= 31);
  const sugerencia = useSugerirAporte({
    monto,
    saldoInicial: meta ? meta.saldo : (saldoInicial ?? 0),
    fechaFinal: final && final > hoy ? final : null,
    frecuencia,
    dia: frecuencia === "semanal" ? null : diaNumero,
  });
  const valor = escrito === undefined ? sugerencia.data?.aporte || null : escrito;
  const fecha = (d: string) => {
    const f = fechaCorta(d, hoy, i18n.language);
    return "clave" in f ? t(f.clave) : f.texto;
  };

  const errores = {
    nombre: !nombre.trim()
      ? "ahorros.formulario.nombreRequerido"
      : nombre.trim().length > 60
        ? "ahorros.formulario.nombreLargo"
        : null,
    monto: !monto ? "ahorros.formulario.montoRequerido" : null,
    plazo: !meta && plazo <= 0 ? "ahorros.formulario.plazoRequerido" : null,
    fecha: !final || final <= hoy ? "ahorros.formulario.fechaRequerida" : null,
    valor: periodicos && !valor ? "ahorros.formulario.valorRequerido" : null,
    dia: periodicos && !diaValido ? "ahorros.formulario.diaRequerido" : null,
    origen: periodicos && !origen ? "ahorros.formulario.origenRequerido" : null,
  };
  const error = (campo: keyof typeof errores) =>
    intento && errores[campo] ? t(errores[campo]) : null;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (Object.values(errores).some(Boolean)) return;
    const datos: DatosMeta = {
      nombre: nombre.trim(),
      icono,
      monto: monto!,
      fechaFinal: final!,
      regla: periodicos
        ? {
            ...leerOrigen(origen, afecta)!,
            valor: valor!,
            frecuencia,
            dia: frecuencia === "semanal" ? null : diaNumero,
          }
        : null,
    };
    const listo = {
      onSuccess: () => {
        toast.success(t(meta ? "ahorros.avisos.guardada" : "ahorros.avisos.creada"));
        alCambiar(false);
      },
    };
    if (meta) editar.mutate({ ...datos, id: meta.id }, listo);
    else crear.mutate({ ...datos, saldoInicial: saldoInicial ?? 0 }, listo);
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t(meta ? "ahorros.formulario.editar" : "ahorros.formulario.nueva")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-meta" disabled={mutacion.isPending}>
            {mutacion.isPending
              ? t("comun.guardando")
              : t(meta ? "ahorros.formulario.guardar" : "ahorros.formulario.crear")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-meta"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <Campo
          etiqueta={t("ahorros.formulario.nombre")}
          autoComplete="off"
          autoFocus={!meta}
          value={nombre}
          error={error("nombre")}
          onChange={(e) => setNombre(e.target.value)}
        />
        <SelectorIconoColor icono={icono} alCambiarIcono={setIcono} />
        <CampoMonto
          etiqueta={t("ahorros.formulario.monto")}
          valor={monto}
          alCambiar={setMonto}
          error={error("monto")}
        />
        {meta ? (
          <Campo
            etiqueta={t("ahorros.formulario.fechaFinal")}
            type="date"
            min={hoy}
            value={fechaFinal}
            error={error("fecha")}
            onChange={(e) => setFechaFinal(e.target.value)}
          />
        ) : (
          <fieldset className="flex flex-col gap-xs">
            <Label asChild>
              <legend className="mb-xs">{t("ahorros.formulario.plazo")}</legend>
            </Label>
            <div className="grid grid-cols-[1fr_2fr] gap-sm">
              <Campo
                etiqueta={t("ahorros.formulario.cantidad")}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={cantidad}
                error={error("plazo")}
                onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
              />
              <RadioGroup
                value={unidad}
                onValueChange={(v) => setUnidad(v as UnidadPlazo)}
                aria-label={t("ahorros.formulario.plazo")}
                className="grid-cols-3 self-end"
              >
                {unidades.map((u) => (
                  <label key={u} className={fila}>
                    <RadioGroupItem value={u} />
                    {t(`ahorros.formulario.unidad.${u}`)}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {final && (
              <p className="text-body-sm text-muted-foreground">
                {t("ahorros.hasta", { fecha: fecha(final) })}
              </p>
            )}
          </fieldset>
        )}
        {!meta && (
          <CampoMonto
            etiqueta={t("ahorros.formulario.saldoInicial")}
            valor={saldoInicial}
            alCambiar={setSaldoInicial}
            ayuda={t("ahorros.formulario.saldoInicialAyuda")}
          />
        )}

        <label className={fila}>
          <Checkbox checked={periodicos} onCheckedChange={(v) => setPeriodicos(v === true)} />
          <span className="flex flex-col py-sm">
            {t("ahorros.formulario.periodicos")}
            <span className="text-body-sm text-muted-foreground">
              {t("ahorros.formulario.periodicosAyuda")}
            </span>
          </span>
        </label>

        {periodicos && (
          <>
            <fieldset className="flex flex-col gap-xs">
              <Label asChild>
                <legend className="mb-xs">{t("ahorros.formulario.frecuencia")}</legend>
              </Label>
              <RadioGroup
                value={frecuencia}
                onValueChange={(v) => setFrecuencia(v as Frecuencia)}
                className="grid-cols-3"
              >
                {frecuencias.map((f) => (
                  <label key={f} className={fila}>
                    <RadioGroupItem value={f} />
                    {t(`ahorros.formulario.frecuencias.${f}`)}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            {frecuencia === "semanal" ? (
              <p className="text-body-sm text-muted-foreground">
                {t("ahorros.formulario.diaSemanal")}
              </p>
            ) : (
              <Campo
                etiqueta={t("ahorros.formulario.dia")}
                inputMode="numeric"
                autoComplete="off"
                maxLength={2}
                value={dia}
                error={error("dia")}
                onChange={(e) => setDia(e.target.value.replace(/\D/g, ""))}
              />
            )}
            {sugerencia.data && (
              <p
                role="status"
                className="rounded-card bg-accent p-md text-body-md text-accent-foreground"
              >
                {sugerencia.data.aportes > 0
                  ? `${t("ahorros.formulario.sugerido", {
                      aporte: formatearPesos(sugerencia.data.aporte),
                      periodo: t(`ahorros.formulario.periodo.${frecuencia}`),
                    })} ${t("ahorros.formulario.llegas", { fecha: fecha(sugerencia.data.ultimaFecha!) })}`
                  : t("ahorros.formulario.sinAportes")}
              </p>
            )}
            <CampoMonto
              etiqueta={t("ahorros.formulario.valorAporte")}
              valor={valor}
              alCambiar={setEscrito}
              error={error("valor")}
            />
            <SelectorOrigen
              etiqueta={t("ahorros.formulario.desde")}
              valor={origen}
              alCambiar={setOrigen}
              afecta={afecta}
              alCambiarAfecta={setAfecta}
              error={error("origen")}
            />
          </>
        )}
        <p className="text-body-sm text-muted-foreground">{t("ahorros.formulario.nota")}</p>
        <AvisoError error={mutacion.error} />
      </form>
    </Ventana>
  );
}

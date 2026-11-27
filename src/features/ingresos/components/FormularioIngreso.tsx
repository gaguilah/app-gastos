import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { SelectorCategoria } from "@/components/shared/SelectorCategoria";
import { Ventana } from "@/components/shared/Ventana";
import { useBolsas } from "@/datos/bolsas";
import { useGuardarIngreso, type Ingreso } from "@/datos/ingresos";
import { formatearPesos } from "@/dominio/dinero";

/** Ingreso que no entra a ninguna bolsa (S3), por ejemplo uno que llega al banco. */
const SIN_BOLSA = "ninguna";

// Los mensajes son claves de i18n; la fecha no futura se valida aquí (supuesto 15).
const esquema = (hoy: string) =>
  z
    .object({
      esSalario: z.boolean(),
      valor: z
        .number("ingresos.formulario.valorRequerido")
        .int()
        .positive("ingresos.formulario.valorRequerido"),
      // Solo en el salario: parte para el presupuesto, de $0 al salario (decisión 1).
      montoPresupuesto: z.number().int().nonnegative().optional(),
      titulo: z
        .string()
        .trim()
        .min(1, "ingresos.formulario.tituloRequerido")
        .max(120, "ingresos.formulario.tituloLargo"),
      fecha: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "ingresos.formulario.fechaRequerida")
        .refine((f) => f <= hoy, "ingresos.formulario.fechaFutura"),
      categoria: z.object({
        categoria: z.string("ingresos.formulario.categoriaRequerida"),
        subcategoria: z.string().nullable(),
      }),
      destino: z.string().optional(),
      sumaPresupuesto: z.boolean(),
      desdeAhora: z.boolean(),
      descripcion: z.string().trim().max(500, "ingresos.formulario.descripcionLarga"),
    })
    .superRefine(
      (v, ctx) => {
        if (v.esSalario) {
          if (v.montoPresupuesto === undefined || (v.valor && v.montoPresupuesto > v.valor))
            ctx.addIssue({
              code: "custom",
              path: ["montoPresupuesto"],
              message: "ingresos.formulario.montoInvalido",
            });
        } else if (!v.destino) {
          ctx.addIssue({
            code: "custom",
            path: ["destino"],
            message: "ingresos.formulario.destinoRequerido",
          });
        }
        // Corre aunque falten otros campos, para marcar todos a la vez.
      },
      { when: () => true },
    );
type Entrada = z.input<ReturnType<typeof esquema>>;
type Valores = z.output<ReturnType<typeof esquema>>;

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  hoy: string;
  /** Sin ingreso, el formulario crea uno nuevo. */
  ingreso?: Ingreso;
  /** Destino elegido de antemano, por ejemplo desde «Recargar → Ingreso nuevo». */
  destinoInicial?: string;
  /** En edición, el botón Eliminar del pie. */
  alEliminar?: () => void;
};

/**
 * Nuevo o editar ingreso (3.5, Etapa 6A): valor, «Es salario» con su parte para el presupuesto, o
 * bolsa (opcional) y «Suma al presupuesto»; título, fecha, categoría de ingreso y descripción.
 */
export function FormularioIngreso({
  abierta,
  alCambiar,
  hoy,
  ingreso,
  destinoInicial,
  alEliminar,
}: Props) {
  const { t } = useTranslation();
  const guardar = useGuardarIngreso();
  const { data: bolsas } = useBolsas();
  const { register, handleSubmit, control, formState } = useForm<Entrada, unknown, Valores>({
    resolver: zodResolver(esquema(hoy)),
    defaultValues: {
      esSalario: ingreso?.esSalario ?? false,
      valor: ingreso?.valor,
      montoPresupuesto: ingreso?.montoPresupuesto ?? undefined,
      titulo: ingreso?.titulo ?? "",
      fecha: ingreso?.fecha ?? hoy,
      categoria: {
        categoria: ingreso?.categoriaId,
        subcategoria: ingreso?.subcategoriaId ?? null,
      },
      destino: ingreso ? (ingreso.bolsaId ?? SIN_BOLSA) : destinoInicial,
      sumaPresupuesto: ingreso?.sumaPresupuesto ?? false,
      desdeAhora: false,
      descripcion: ingreso?.descripcion ?? "",
    },
  });
  const [esSalario, valor, monto, destino, suma] = useWatch({
    control,
    name: ["esSalario", "valor", "montoPresupuesto", "destino", "sumaPresupuesto"],
  });
  const bolsaDestino = bolsas?.find((b) => b.id === destino);
  const mensaje = (clave?: string) => (clave ? t(clave) : null);
  const { errors } = formState;
  const editandoSalario = Boolean(ingreso?.esSalario && esSalario);

  const efecto = () => {
    if (esSalario) {
      if (!valor || monto === undefined || monto > valor) return null;
      return t("ingresos.formulario.efectoSalario", {
        monto: formatearPesos(monto),
        resto: formatearPesos(valor - monto),
      });
    }
    if (!destino) return null;
    if (destino === SIN_BOLSA)
      return t(
        suma ? "ingresos.formulario.efectoPresupuesto" : "ingresos.formulario.efectoNinguno",
      );
    if (!bolsaDestino) return null;
    return t(
      suma ? "ingresos.formulario.efectoBolsaPresupuesto" : "ingresos.formulario.efectoBolsa",
      { nombre: bolsaDestino.nombre },
    );
  };

  const enviar = (v: Valores) =>
    guardar.mutate(
      {
        id: ingreso?.id,
        fechaAnterior: ingreso?.fecha,
        desdeAhora: editandoSalario && v.desdeAhora,
        datos: {
          titulo: v.titulo,
          fecha: v.fecha,
          valor: v.valor,
          descripcion: v.descripcion || null,
          categoriaId: v.categoria.categoria,
          subcategoriaId: v.categoria.subcategoria,
          esSalario: v.esSalario,
          montoPresupuesto: v.esSalario ? (v.montoPresupuesto ?? 0) : null,
          bolsaId: v.esSalario || v.destino === SIN_BOLSA ? null : (v.destino ?? null),
          sumaPresupuesto: !v.esSalario && v.sumaPresupuesto,
        },
      },
      {
        onSuccess: (advertencia) => {
          toast.success(t("ingresos.avisos.guardado"));
          // Decisión 8: se guarda igual, pero se avisa si un cierre quedó en negativo.
          if (advertencia) toast.warning(t("ingresos.avisos.sobranteNegativo"));
          alCambiar(false);
        },
      },
    );

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t(ingreso ? "ingresos.formulario.editar" : "ingresos.formulario.nuevo")}
      formulario
      pie={
        <>
          {alEliminar && (
            <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={alEliminar}>
              {t("ingresos.acciones.eliminar")}
            </Button>
          )}
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-ingreso" disabled={guardar.isPending}>
            {guardar.isPending
              ? t("comun.guardando")
              : t(ingreso ? "ingresos.formulario.guardarCambios" : "ingresos.formulario.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-ingreso"
        noValidate
        onSubmit={(e) => void handleSubmit(enviar)(e)}
        className="flex flex-col gap-md pb-md"
      >
        <label className="flex min-h-touch cursor-pointer items-center gap-sm text-body-md">
          <Controller
            control={control}
            name="esSalario"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => {
                  field.onChange(v === true);
                  guardar.reset();
                }}
              />
            )}
          />
          {t("ingresos.formulario.esSalario")}
        </label>
        <Controller
          control={control}
          name="valor"
          render={({ field }) => (
            <CampoMonto
              etiqueta={t(esSalario ? "ingresos.formulario.salario" : "ingresos.formulario.valor")}
              valor={field.value ?? null}
              alCambiar={(v) => field.onChange(v ?? undefined)}
              onBlur={field.onBlur}
              autoFocus={!ingreso}
              ayuda={esSalario ? t("ingresos.formulario.ayudaSalario") : undefined}
              error={mensaje(errors.valor?.message)}
            />
          )}
        />
        {esSalario && (
          <Controller
            control={control}
            name="montoPresupuesto"
            render={({ field }) => (
              <CampoMonto
                etiqueta={t("ingresos.formulario.montoPresupuesto")}
                valor={field.value ?? null}
                alCambiar={(v) => field.onChange(v ?? undefined)}
                onBlur={field.onBlur}
                ayuda={t("ingresos.formulario.montoPresupuestoAyuda")}
                error={mensaje(errors.montoPresupuesto?.message)}
              />
            )}
          />
        )}
        <Campo
          etiqueta={t("ingresos.formulario.titulo")}
          autoComplete="off"
          error={mensaje(errors.titulo?.message)}
          {...register("titulo")}
        />
        <Campo
          etiqueta={t("ingresos.formulario.fecha")}
          type="date"
          max={hoy}
          error={mensaje(errors.fecha?.message)}
          {...register("fecha")}
        />
        <Controller
          control={control}
          name="categoria"
          render={({ field }) => (
            <SelectorCategoria
              etiqueta={t("ingresos.formulario.categoria")}
              tipo="ingreso"
              valor={{
                categoria: field.value.categoria ?? null,
                subcategoria: field.value.subcategoria,
              }}
              alCambiar={field.onChange}
              error={mensaje(errors.categoria?.categoria?.message ?? errors.categoria?.message)}
            />
          )}
        />
        {!esSalario && (
          <>
            <Controller
              control={control}
              name="destino"
              render={({ field }) => (
                <SelectorBolsa
                  etiqueta={t("ingresos.formulario.destino")}
                  valor={field.value ?? null}
                  alCambiar={field.onChange}
                  extras={[
                    {
                      valor: SIN_BOLSA,
                      etiqueta: t("ingresos.formulario.sinBolsa"),
                      ayuda: t("ingresos.formulario.sinBolsaAyuda"),
                    },
                  ]}
                  error={mensaje(errors.destino?.message)}
                />
              )}
            />
            <label className="flex min-h-touch cursor-pointer items-center gap-sm text-body-md">
              <Controller
                control={control}
                name="sumaPresupuesto"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                )}
              />
              {t("ingresos.formulario.sumaPresupuesto")}
            </label>
          </>
        )}
        {efecto() && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {efecto()}
          </p>
        )}
        {editandoSalario && (
          <fieldset className="flex flex-col gap-xs">
            <legend className="mb-xs text-body-md font-medium">
              {t("ingresos.formulario.alcance")}
            </legend>
            <Controller
              control={control}
              name="desdeAhora"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ? "base" : "periodo"}
                  onValueChange={(v) => field.onChange(v === "base")}
                  className="gap-xs"
                >
                  {(["periodo", "base"] as const).map((o) => (
                    <label
                      key={o}
                      className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md text-body-md has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value={o} />
                      {t(`ingresos.formulario.alcance${o === "base" ? "Base" : "Periodo"}`)}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </fieldset>
        )}
        <Campo
          etiqueta={t("ingresos.formulario.descripcion")}
          autoComplete="off"
          error={mensaje(errors.descripcion?.message)}
          {...register("descripcion")}
        />
        <AvisoError error={guardar.error} />
      </form>
    </Ventana>
  );
}

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { Campo } from "@/components/shared/Campo";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorBolsa } from "@/components/shared/SelectorBolsa";
import { SelectorCategoria } from "@/components/shared/SelectorCategoria";
import { Ventana } from "@/components/shared/Ventana";
import { useBolsas } from "@/datos/bolsas";
import { useGuardarIngreso, type Ingreso } from "@/datos/ingresos";

const PRESUPUESTO = "presupuesto";

// Los mensajes son claves de i18n; la fecha no futura se valida aquí (supuesto 15).
const esquema = (hoy: string) =>
  z.object({
    valor: z
      .number("ingresos.formulario.valorRequerido")
      .int()
      .positive("ingresos.formulario.valorRequerido"),
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
    destino: z.string("ingresos.formulario.destinoRequerido"),
    descripcion: z.string().trim().max(500, "ingresos.formulario.descripcionLarga"),
  });
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

/** Nuevo o editar ingreso: valor, título, fecha, categoría de ingreso, destino y descripción (3.5). */
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
      valor: ingreso?.valor,
      titulo: ingreso?.titulo ?? "",
      fecha: ingreso?.fecha ?? hoy,
      categoria: {
        categoria: ingreso?.categoriaId,
        subcategoria: ingreso?.subcategoriaId ?? null,
      },
      destino: ingreso ? (ingreso.bolsaId ?? PRESUPUESTO) : destinoInicial,
      descripcion: ingreso?.descripcion ?? "",
    },
  });
  const destino = useWatch({ control, name: "destino" });
  const bolsaDestino = bolsas?.find((b) => b.id === destino);
  const mensaje = (clave?: string) => (clave ? t(clave) : null);
  const { errors } = formState;

  const enviar = (v: Valores) =>
    guardar.mutate(
      {
        id: ingreso?.id,
        datos: {
          titulo: v.titulo,
          fecha: v.fecha,
          valor: v.valor,
          descripcion: v.descripcion || null,
          categoriaId: v.categoria.categoria,
          subcategoriaId: v.categoria.subcategoria,
          bolsaId: v.destino === PRESUPUESTO ? null : v.destino,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("ingresos.avisos.guardado"));
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
        <Controller
          control={control}
          name="valor"
          render={({ field }) => (
            <CampoMonto
              etiqueta={t("ingresos.formulario.valor")}
              valor={field.value ?? null}
              alCambiar={(v) => field.onChange(v ?? undefined)}
              onBlur={field.onBlur}
              autoFocus={!ingreso}
              error={mensaje(errors.valor?.message)}
            />
          )}
        />
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
                  valor: PRESUPUESTO,
                  etiqueta: t("ingresos.formulario.presupuesto"),
                  ayuda: t("ingresos.formulario.presupuestoAyuda"),
                },
              ]}
              error={mensaje(errors.destino?.message)}
            />
          )}
        />
        {destino && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {destino === PRESUPUESTO
              ? t("ingresos.formulario.efectoPresupuesto")
              : bolsaDestino &&
                t("ingresos.formulario.efectoBolsa", { nombre: bolsaDestino.nombre })}
          </p>
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

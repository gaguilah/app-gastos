import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { SelectorCategoria } from "@/components/shared/SelectorCategoria";
import { Ventana } from "@/components/shared/Ventana";
import { useCategorias } from "@/datos/categorias";
import { useConfigurarSalario, type Presupuesto } from "@/datos/presupuesto";

// Mensajes como claves de i18n. $0 quiere decir «sin salario»: los períodos no lo crean (S1).
const esquema = z
  .object({
    salario: z.number("presupuesto.salario.salarioRequerido").int().nonnegative(),
    presupuesto: z.number("presupuesto.salario.montoInvalido").int().nonnegative(),
    // Opcional: sin elegir, la base de datos usa la categoría de ingreso «Salario».
    categoria: z.string().optional(),
    actual: z.boolean(),
  })
  .refine((v) => v.presupuesto <= v.salario, {
    path: ["presupuesto"],
    message: "presupuesto.salario.montoInvalido",
  });
type Entrada = z.input<typeof esquema>;
type Valores = z.output<typeof esquema>;

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  datos: Pick<Presupuesto, "salarioBase" | "presupuestoSalarioBase" | "categoriaSalarioId">;
  /** Hay un período en curso al que aplicar el salario. */
  conPeriodoActual: boolean;
};

/** Salario base con que abre cada período y su parte para el presupuesto (decisión 2, S1). */
export function DialogoSalarioBase({ abierta, alCambiar, datos, conPeriodoActual }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const configurar = useConfigurarSalario();
  const { data: categorias } = useCategorias();
  const porDefecto = categorias?.find(
    (c) => c.tipo === "ingreso" && c.nombre.toLocaleLowerCase("es") === "salario",
  )?.id;
  const configurado = datos.salarioBase > 0;
  const { control, handleSubmit, formState } = useForm<Entrada, unknown, Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      salario: configurado ? datos.salarioBase : undefined,
      presupuesto: configurado ? datos.presupuestoSalarioBase : undefined,
      categoria: datos.categoriaSalarioId ?? undefined,
      actual: !configurado,
    },
  });
  const salario = useWatch({ control, name: "salario" });
  const mensaje = (clave?: string) => (clave ? t(clave) : null);
  const { errors } = formState;

  const enviar = (v: Valores) =>
    configurar.mutate(
      {
        salario: v.salario,
        presupuesto: v.presupuesto,
        categoriaId: v.categoria ?? porDefecto ?? null,
        actual: conPeriodoActual && v.actual && v.salario > 0,
      },
      {
        onSuccess: () => {
          toast.success(t("presupuesto.guardado"));
          alCambiar(false);
        },
      },
    );

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("presupuesto.salario.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-salario" disabled={configurar.isPending}>
            {configurar.isPending ? t("comun.guardando") : t("comun.guardar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-salario"
        noValidate
        onSubmit={(e) => void handleSubmit(enviar)(e)}
        className="flex flex-col gap-md pb-md"
      >
        <Controller
          control={control}
          name="salario"
          render={({ field }) => (
            <CampoMonto
              etiqueta={t("presupuesto.salario.salario")}
              valor={field.value ?? null}
              alCambiar={(v) => field.onChange(v ?? undefined)}
              onBlur={field.onBlur}
              autoFocus
              ayuda={t("presupuesto.salario.ayuda")}
              error={mensaje(errors.salario?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="presupuesto"
          render={({ field }) => (
            <CampoMonto
              etiqueta={t("presupuesto.salario.montoPresupuesto")}
              valor={field.value ?? null}
              alCambiar={(v) => field.onChange(v ?? undefined)}
              onBlur={field.onBlur}
              ayuda={t("presupuesto.salario.montoPresupuestoAyuda")}
              error={mensaje(errors.presupuesto?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="categoria"
          render={({ field }) => (
            <SelectorCategoria
              etiqueta={t("presupuesto.salario.categoria")}
              tipo="ingreso"
              valor={{ categoria: field.value ?? porDefecto ?? null, subcategoria: null }}
              alCambiar={(v) => field.onChange(v.categoria ?? undefined)}
              error={mensaje(errors.categoria?.message)}
            />
          )}
        />
        {conPeriodoActual && salario !== 0 && (
          <div className="flex min-h-touch items-start gap-sm text-body-md">
            <Controller
              control={control}
              name="actual"
              render={({ field }) => (
                <Checkbox
                  id={`${id}-actual`}
                  aria-describedby={`${id}-actual-ayuda`}
                  className="mt-xs"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <div className="flex flex-col">
              <label htmlFor={`${id}-actual`} className="cursor-pointer">
                {t("presupuesto.salario.actual")}
              </label>
              <span id={`${id}-actual-ayuda`} className="text-body-sm text-muted-foreground">
                {t("presupuesto.salario.actualAyuda")}
              </span>
            </div>
          </div>
        )}
        <AvisoError error={configurar.error} />
      </form>
    </Ventana>
  );
}

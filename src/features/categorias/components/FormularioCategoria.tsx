import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert, Lock, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Campo } from "@/components/shared/Campo";
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { SelectorIconoColor } from "@/components/shared/SelectorIconoColor";
import { paletaCategorias } from "@/components/shared/iconos-categoria";
import { Ventana } from "@/components/shared/Ventana";
import {
  useCrearCategoria,
  useEditarCategoria,
  type Categoria,
  type TipoCategoria,
} from "@/datos/categorias";
import { claveErrorDatos } from "@/datos/errores";

const esquema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "categorias.formulario.nombreObligatorio")
    .max(60, "categorias.formulario.nombreLargo"),
  icono: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
type Valores = z.infer<typeof esquema>;

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  tipo: TipoCategoria;
  /** Sin categoría, el formulario crea una nueva. */
  categoria?: Categoria;
};

const mismoNombre = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), "es", { sensitivity: "base" }) === 0;

/** Crear o editar una categoría: vista previa, nombre, ícono, color y subcategorías (3.11). */
export function FormularioCategoria({ abierta, alCambiar, tipo, categoria }: Props) {
  const { t } = useTranslation();
  const crear = useCrearCategoria();
  const editar = useEditarCategoria();
  const mutacion = categoria ? editar : crear;

  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [nuevas, setNuevas] = useState<string[]>([]);
  const [nuevaSub, setNuevaSub] = useState("");
  const [errorSub, setErrorSub] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: categoria?.nombre ?? "",
      icono: categoria?.icono ?? "ellipsis",
      color: categoria?.color ?? paletaCategorias[0]!.hex,
    },
  });
  const [nombre, icono, color] = useWatch({ control, name: ["nombre", "icono", "color"] });

  const existentes = (categoria?.subcategorias ?? []).filter((s) => !quitadas.includes(s.id));

  const agregarSub = () => {
    const texto = nuevaSub.trim();
    if (!texto) return;
    if ([...existentes.map((s) => s.nombre), ...nuevas].some((n) => mismoNombre(n, texto))) {
      setErrorSub(t("categorias.formulario.subRepetida"));
      return;
    }
    setNuevas((lista) => [...lista, texto]);
    setNuevaSub("");
    setErrorSub(null);
  };

  const guardar = handleSubmit((valores) => {
    const alTerminar = {
      onSuccess: () => {
        toast.success(t(categoria ? "categorias.avisos.guardada" : "categorias.avisos.creada"));
        alCambiar(false);
      },
    };
    if (categoria) {
      editar.mutate({ ...valores, id: categoria.id, tipo, nuevas, quitadas }, alTerminar);
    } else {
      crear.mutate({ ...valores, tipo, nuevas }, alTerminar);
    }
  });

  const errorNombre = formState.errors.nombre?.message;

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      formulario
      titulo={
        categoria
          ? t("categorias.formulario.editarTitulo", { nombre: categoria.nombre })
          : t("categorias.nueva")
      }
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-categoria" disabled={mutacion.isPending}>
            {mutacion.isPending
              ? t("comun.guardando")
              : t(
                  categoria
                    ? "categorias.formulario.guardarCambios"
                    : "categorias.formulario.guardar",
                )}
          </Button>
        </>
      }
    >
      <form
        id="formulario-categoria"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-lg pb-md"
      >
        {categoria?.delSistema && (
          <p className="flex items-start gap-sm rounded-control bg-muted px-md py-sm text-body-sm text-muted-foreground">
            <Lock className="size-icono shrink-0" aria-hidden="true" />
            {t("categorias.formulario.sistema")}
          </p>
        )}
        {mutacion.isError && (
          <Alert variant="error">
            <CircleAlert aria-hidden="true" />
            <p>{t(claveErrorDatos(mutacion.error))}</p>
          </Alert>
        )}

        <div className="flex flex-col gap-xs">
          <span className="text-label-tag text-muted-foreground uppercase">
            {t("categorias.formulario.vistaPrevia")}
          </span>
          <div className="flex items-center gap-sm rounded-control border border-border bg-background px-md py-sm">
            <IconoCategoria icono={icono} color={color} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-title">
                {nombre.trim() || t("categorias.formulario.sinNombre")}
              </span>
              <span className="text-body-sm text-muted-foreground">
                {t("categorias.formulario.asiSeVera")}
              </span>
            </span>
            <Badge>{t(`categorias.tipos.${tipo}`)}</Badge>
          </div>
        </div>

        <Campo
          etiqueta={t("categorias.formulario.nombre")}
          autoComplete="off"
          error={errorNombre ? t(errorNombre) : null}
          {...register("nombre")}
        />

        <SelectorIconoColor
          icono={icono}
          color={color}
          alCambiarIcono={(valor) => setValue("icono", valor)}
          alCambiarColor={(valor) => setValue("color", valor)}
        />

        <fieldset className="flex flex-col gap-sm">
          <legend className="mb-sm text-label-tag text-muted-foreground uppercase">
            {t("categorias.formulario.subcategorias")}
          </legend>
          {(existentes.length > 0 || nuevas.length > 0) && (
            <ul className="flex flex-wrap gap-sm">
              {existentes.map((s) => (
                <Chip
                  key={s.id}
                  nombre={s.nombre}
                  alQuitar={() => setQuitadas((lista) => [...lista, s.id])}
                />
              ))}
              {nuevas.map((n) => (
                <Chip
                  key={n}
                  nombre={n}
                  alQuitar={() => setNuevas((l) => l.filter((x) => x !== n))}
                />
              ))}
            </ul>
          )}
          <div className="flex gap-sm">
            <Label htmlFor="nueva-subcategoria" className="sr-only">
              {t("categorias.formulario.nuevaSub")}
            </Label>
            <Input
              id="nueva-subcategoria"
              value={nuevaSub}
              placeholder={t("categorias.formulario.nuevaSub")}
              autoComplete="off"
              aria-invalid={Boolean(errorSub) || undefined}
              aria-describedby={errorSub ? "nueva-subcategoria-error" : undefined}
              onChange={(e) => setNuevaSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarSub();
                }
              }}
            />
            <Button type="button" variant="secondary" className="h-campo" onClick={agregarSub}>
              <Plus aria-hidden="true" />
              {t("categorias.formulario.agregar")}
            </Button>
          </div>
          {errorSub && (
            <p
              id="nueva-subcategoria-error"
              className="flex items-center gap-xs text-body-sm text-destructive"
            >
              <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
              {errorSub}
            </p>
          )}
          {quitadas.length > 0 && (
            <p className="text-body-sm text-muted-foreground">
              {t("categorias.formulario.quitarAviso")}
            </p>
          )}
        </fieldset>
      </form>
    </Ventana>
  );
}

function Chip({ nombre, alQuitar }: { nombre: string; alQuitar: () => void }) {
  const { t } = useTranslation();
  return (
    <li className="flex min-h-touch items-center gap-xs rounded-chip border border-input bg-card pl-md">
      <span className="text-body-md">{nombre}</span>
      <button
        type="button"
        aria-label={t("categorias.formulario.quitarSub", { nombre })}
        onClick={alQuitar}
        className="inline-flex size-touch items-center justify-center rounded-chip text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-icono-sm" aria-hidden="true" />
      </button>
    </li>
  );
}

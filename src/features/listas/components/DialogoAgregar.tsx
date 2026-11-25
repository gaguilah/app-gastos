import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Campo } from "@/components/shared/Campo";
import { Ventana } from "@/components/shared/Ventana";
import { useAgregar, type Elemento, type Lista } from "@/datos/listas";
import { AvisoError } from "./AvisoError";

// Las tarjetas se crean desde Deudas (Etapa 9) y las bolsas desde Bolsas (Etapa 6).
const subtipos: Record<Lista, string[]> = {
  formas: ["medio", "canal"],
  lugares: [],
  personas: ["persona", "banco"],
};

type Props = {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  lista: Lista;
  elementos: Elemento[];
};

/** Agregar a la lista actual. Un nombre que ya existe no crea otro (3.9). */
export function DialogoAgregar({ abierta, alCambiar, lista, elementos }: Props) {
  const { t } = useTranslation();
  const agregar = useAgregar();
  const opciones = subtipos[lista];
  const [subtipo, setSubtipo] = useState(opciones[0] ?? null);
  const [nombre, setNombre] = useState("");
  const [vacio, setVacio] = useState(false);
  const [existente, setExistente] = useState<string | null>(null);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) {
      setVacio(true);
      return;
    }
    agregar.mutate(
      { lista, nombre: texto, subtipo },
      {
        onSuccess: ({ id, estado }) => {
          if (estado === "existente") {
            setExistente(elementos.find((x) => x.id === id)?.nombre ?? texto);
            return;
          }
          toast.success(
            t(estado === "reactivado" ? "listas.avisos.reactivado" : "listas.avisos.creado"),
          );
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("listas.nuevo.titulo")}
      descripcion={t("listas.nuevo.ayuda")}
      pie={
        existente ? (
          <Button onClick={() => alCambiar(false)}>{t("listas.nuevo.usarExistente")}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => alCambiar(false)}>
              {t("comun.cancelar")}
            </Button>
            <Button type="submit" form="formulario-lista" disabled={agregar.isPending}>
              {agregar.isPending ? t("comun.guardando") : t("listas.nuevo.guardar")}
            </Button>
          </>
        )
      }
    >
      <form
        id="formulario-lista"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <AvisoError error={agregar.error} />
        {existente && (
          <Alert variant="warning">
            <Info aria-hidden="true" />
            <p>{t("listas.nuevo.existe", { nombre: existente })}</p>
          </Alert>
        )}
        {opciones.length > 0 && (
          <div className="flex flex-col gap-xs">
            <Label id="tipo-lista">{t("listas.nuevo.tipo")}</Label>
            <RadioGroup
              value={subtipo ?? undefined}
              onValueChange={setSubtipo}
              aria-labelledby="tipo-lista"
              className="flex flex-wrap gap-md"
            >
              {opciones.map((o) => (
                <label key={o} className="flex min-h-touch cursor-pointer items-center gap-sm">
                  <RadioGroupItem value={o} />
                  <span className="text-body-md">{t(`listas.subtipos.${o}`)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}
        <Campo
          etiqueta={t("listas.nuevo.nombre")}
          autoComplete="off"
          value={nombre}
          error={vacio ? t("categorias.formulario.nombreObligatorio") : null}
          onChange={(e) => {
            setNombre(e.target.value);
            setVacio(false);
            setExistente(null);
          }}
        />
      </form>
    </Ventana>
  );
}

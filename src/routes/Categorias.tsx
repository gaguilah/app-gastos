import { useState } from "react";
import { Info, Plus, Shapes } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Estado, EstadoCarga, EstadoError } from "@/components/shared/Estado";
import {
  tiposCategoria,
  useCategorias,
  type Categoria,
  type TipoCategoria,
} from "@/datos/categorias";
import { DialogoEliminar } from "@/features/categorias/components/DialogoEliminar";
import { DialogoSubcategoria } from "@/features/categorias/components/DialogoSubcategoria";
import { FormularioCategoria } from "@/features/categorias/components/FormularioCategoria";
import {
  ListaCategorias,
  type AccionCategoria,
} from "@/features/categorias/components/ListaCategorias";

type Abierta = { accion: AccionCategoria | "nueva"; categoria?: Categoria } | null;

const esTipo = (valor: string | null): valor is TipoCategoria =>
  tiposCategoria.includes(valor as TipoCategoria);

/** Categorías por tipo con su ícono, color y subcategorías (plan 3.11 y 3.14, Etapa 5). */
export function Categorias() {
  const { t } = useTranslation();
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("tipo");
  const tipo: TipoCategoria = esTipo(pedido) ? pedido : "gasto";
  const consulta = useCategorias();
  const [abierta, setAbierta] = useState<Abierta>(null);

  const todas = consulta.data ?? [];
  const delTipo = todas.filter((c) => c.tipo === tipo);
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const nueva = () => setAbierta({ accion: "nueva" });

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("categorias.titulo")}</h1>
          <p className="text-body-md text-muted-foreground">{t("categorias.descripcion")}</p>
        </div>
        <Button onClick={nueva}>
          <Plus aria-hidden="true" />
          {t("categorias.nueva")}
        </Button>
      </header>

      <Tabs
        value={tipo}
        onValueChange={(valor) => setParametros({ tipo: valor }, { replace: true })}
      >
        <TabsList aria-label={t("categorias.pestanas")}>
          {tiposCategoria.map((tp) => (
            <TabsTrigger key={tp} value={tp}>
              {t("categorias.pestana", {
                tipo: t(`categorias.tipos.${tp}`),
                total: todas.filter((c) => c.tipo === tp).length,
              })}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {consulta.isPending ? (
        <EstadoCarga filas={4} />
      ) : consulta.isError ? (
        <EstadoError
          mensaje={t("categorias.error.mensaje")}
          alReintentar={() => void consulta.refetch()}
        />
      ) : delTipo.length === 0 ? (
        <Estado
          Icono={Shapes}
          titulo={t("categorias.vacio.titulo")}
          mensaje={t("categorias.vacio.mensaje")}
        >
          <Button onClick={nueva}>
            <Plus aria-hidden="true" />
            {t("categorias.vacio.accion")}
          </Button>
        </Estado>
      ) : (
        <>
          <ListaCategorias
            categorias={delTipo}
            alElegir={(accion, categoria) => setAbierta({ accion, categoria })}
          />
          {delTipo.some((c) => c.delSistema) && (
            <p className="flex items-center gap-xs text-body-sm text-muted-foreground">
              <Info className="size-icono-sm shrink-0" aria-hidden="true" />
              {t("categorias.avisoSistema")}
            </p>
          )}
        </>
      )}

      {(abierta?.accion === "nueva" || abierta?.accion === "editar") && (
        <FormularioCategoria
          key={abierta.categoria?.id ?? "nueva"}
          abierta
          alCambiar={cerrar}
          tipo={abierta.categoria?.tipo ?? tipo}
          categoria={abierta.categoria}
        />
      )}
      {abierta?.accion === "agregarSub" && abierta.categoria && (
        <DialogoSubcategoria abierta alCambiar={cerrar} categoria={abierta.categoria} />
      )}
      {abierta?.accion === "eliminar" && abierta.categoria && (
        <DialogoEliminar abierta alCambiar={cerrar} categoria={abierta.categoria} />
      )}
    </main>
  );
}

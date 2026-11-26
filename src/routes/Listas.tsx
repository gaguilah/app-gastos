import { useState } from "react";
import { Info, ListPlus, Plus, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Estado, EstadoCarga, EstadoError } from "@/components/shared/Estado";
import {
  listas,
  useListas,
  usePosiblesDuplicados,
  type Elemento,
  type Lista,
} from "@/datos/listas";
import { diaBogota } from "@/dominio/fechas";
import { DialogoAgregar } from "@/features/listas/components/DialogoAgregar";
import { DialogoEliminarElemento } from "@/features/listas/components/DialogoEliminarElemento";
import { DialogoRenombrar } from "@/features/listas/components/DialogoRenombrar";
import { DialogoUnir } from "@/features/listas/components/DialogoUnir";
import { ListaElementos, type AccionLista } from "@/features/listas/components/ListaElementos";
import { candidatosUnir } from "@/features/listas/textos";

type Abierta =
  | { accion: "agregar" }
  | { accion: Exclude<AccionLista, "unir">; elemento: Elemento }
  | { accion: "unir"; elemento: Elemento; destino?: string; desdeDuplicado?: boolean }
  | null;

const esLista = (valor: string | null): valor is Lista => listas.includes(valor as Lista);
const mismoNombre = (a: string, b: string) =>
  a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

/** Formas de pago, lugares y personas: agregar, renombrar, unir y eliminar (3.9, 3.12, 3.14). */
export function Listas() {
  const { t } = useTranslation();
  const [parametros, setParametros] = useSearchParams();
  const pedida = parametros.get("lista");
  const lista: Lista = esLista(pedida) ? pedida : "formas";
  const consulta = useListas();
  const duplicados = usePosiblesDuplicados(lista);
  const [abierta, setAbierta] = useState<Abierta>(null);
  const hoy = diaBogota(new Date());

  const elementos = consulta.data?.[lista] ?? [];
  const porId = (id: string) => elementos.find((e) => e.id === id);
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const agregar = () => setAbierta({ accion: "agregar" });

  const revisar = (aId: string, bId: string) => {
    const a = porId(aId);
    const b = porId(bId);
    if (!a || !b) return;
    // Se conserva el que más se usa.
    const [origen, destino] = a.usos > b.usos ? [b, a] : [a, b];
    setAbierta({ accion: "unir", elemento: origen, destino: destino.id, desdeDuplicado: true });
  };

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("listas.titulo")}</h1>
          <p className="text-body-md text-muted-foreground">{t("listas.descripcion")}</p>
        </div>
        <Button onClick={agregar}>
          <Plus aria-hidden="true" />
          {t("listas.agregar")}
        </Button>
      </header>

      <Tabs
        value={lista}
        onValueChange={(valor) => setParametros({ lista: valor }, { replace: true })}
      >
        <TabsList aria-label={t("listas.pestanas")}>
          {listas.map((l) => (
            <TabsTrigger key={l} value={l}>
              {t(`listas.pestana.${l}`, { total: consulta.data?.[l].length ?? 0 })}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={lista} className="flex flex-col gap-lg">
          {consulta.isPending ? (
            <EstadoCarga filas={4} />
          ) : consulta.isError ? (
            <EstadoError
              mensaje={t("listas.error.mensaje")}
              alReintentar={() => void consulta.refetch()}
            />
          ) : elementos.length === 0 ? (
            <Estado
              Icono={ListPlus}
              titulo={t("listas.vacio.titulo")}
              mensaje={t("listas.vacio.mensaje")}
            >
              <Button onClick={agregar}>
                <Plus aria-hidden="true" />
                {t("listas.vacio.agregar")}
              </Button>
            </Estado>
          ) : (
            <>
              {lista !== "formas" &&
                duplicados.data?.map((par) => (
                  <Alert
                    key={`${par.a.id}-${par.b.id}`}
                    variant="warning"
                    role="status"
                    className="items-center"
                  >
                    <TriangleAlert aria-hidden="true" />
                    <p className="flex-1">
                      <strong>{t("listas.duplicado.aviso")}</strong>{" "}
                      {t("listas.duplicado.mensaje", { a: par.a.nombre, b: par.b.nombre })}
                    </p>
                    <Button variant="secondary" onClick={() => revisar(par.a.id, par.b.id)}>
                      {t("listas.duplicado.revisar")}
                    </Button>
                  </Alert>
                ))}
              <ListaElementos
                lista={lista}
                elementos={elementos}
                hoy={hoy}
                alElegir={(accion, elemento) => setAbierta({ accion, elemento })}
              />
            </>
          )}
          {lista === "formas" && !consulta.isPending && !consulta.isError && (
            <p className="flex items-center gap-xs text-body-sm text-muted-foreground">
              <Info className="size-icono-sm shrink-0" aria-hidden="true" />
              {t("listas.avisoBolsas")}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {abierta?.accion === "agregar" && (
        <DialogoAgregar
          key={lista}
          abierta
          alCambiar={cerrar}
          lista={lista}
          elementos={elementos}
        />
      )}
      {abierta?.accion === "renombrar" && (
        <DialogoRenombrar
          abierta
          alCambiar={cerrar}
          lista={lista}
          elemento={abierta.elemento}
          alUnir={(nombre) => {
            const e = abierta.elemento;
            // Solo preselecciona: quien decide si es el mismo nombre es la base de datos.
            const igual = candidatosUnir(e, elementos).find((c) => mismoNombre(c.nombre, nombre));
            setAbierta({ accion: "unir", elemento: e, destino: igual?.id });
          }}
        />
      )}
      {abierta?.accion === "unir" && (
        <DialogoUnir
          abierta
          alCambiar={cerrar}
          lista={lista}
          origen={abierta.elemento}
          candidatos={candidatosUnir(abierta.elemento, elementos)}
          destinoInicial={abierta.destino}
          desdeDuplicado={abierta.desdeDuplicado}
        />
      )}
      {abierta?.accion === "eliminar" && (
        <DialogoEliminarElemento
          abierta
          alCambiar={cerrar}
          lista={lista}
          elemento={abierta.elemento}
        />
      )}
    </main>
  );
}

import { useState } from "react";
import { ArrowLeft, CircleAlert, Pencil, Trash2, Wallet } from "lucide-react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { EstadoCarga, EstadoError } from "@/components/shared/Estado";
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { MenuAcciones } from "@/components/shared/MenuAcciones";
import { useCierre, useVolverACerrar, type Cierre, type Destino } from "@/datos/cierre";
import { formatearPesos } from "@/dominio/dinero";
import { diaBogota, fechaLarga, rangoPeriodo } from "@/dominio/fechas";
import { DialogoDestinar } from "@/features/presupuesto/components/DialogoDestinar";
import { DialogoEditarDestino } from "@/features/presupuesto/components/DialogoEditarDestino";
import { DialogoEliminarDestino } from "@/features/presupuesto/components/DialogoEliminarDestino";
import { cn } from "@/lib/utils";

type Abierta = { accion: "destinar" } | { accion: "editar" | "eliminar"; destino: Destino };

const tarjeta = "flex flex-col gap-md rounded-card border bg-card p-md xl:p-lg";

/**
 * Cierre de un período (Etapa 6A, decisiones 5 a 8): sobrante del salario y del presupuesto por
 * separado, disponible de cada bolsa, destinos y «No destinado»; destinar y volver a cerrar.
 */
export function CierrePeriodo() {
  const { t, i18n } = useTranslation();
  const { periodoId } = useParams();
  const consulta = useCierre(periodoId);
  const volver = useVolverACerrar();
  const [abierta, setAbierta] = useState<Abierta | null>(null);
  const cerrar = (valor: boolean) => !valor && setAbierta(null);
  const c = consulta.data;
  // Dentro de la frase: «Cerrado el viernes, …» en español; en inglés el día va en mayúscula.
  const enFrase = (dia: string) => {
    const texto = fechaLarga(dia, i18n.language);
    return i18n.language === "en" ? texto : texto.charAt(0).toLowerCase() + texto.slice(1);
  };
  const fecha = (instante: string) => enFrase(diaBogota(new Date(instante)));

  const recerrar = () =>
    volver.mutate(periodoId!, { onSuccess: () => toast.success(t("cierre.avisos.recerrado")) });

  return (
    <main className="flex flex-col gap-lg p-pagina-movil md:p-pagina-tablet xl:p-pagina-pc">
      <header className="flex flex-col gap-xs">
        <Button asChild variant="ghost" className="-ml-sm self-start">
          <Link to="/presupuesto">
            <ArrowLeft aria-hidden="true" />
            {t("cierre.volver")}
          </Link>
        </Button>
        <h1 className="text-headline-lg-movil xl:text-headline-lg">{t("cierre.titulo")}</h1>
        {c && (
          <p className="text-body-md text-muted-foreground">
            {rangoPeriodo(c.inicio, c.fin, i18n.language)}
          </p>
        )}
      </header>

      {consulta.isPending ? (
        <EstadoCarga filas={4} />
      ) : consulta.isError ? (
        <EstadoError
          mensaje={t("presupuesto.errorMensaje")}
          alReintentar={() => void consulta.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-col gap-sm md:flex-row md:flex-wrap md:items-center md:justify-between">
            <p className="text-body-md">
              {c!.recerradoAt
                ? t("cierre.estado.recerrado", { fecha: fecha(c!.recerradoAt) })
                : c!.cerradoAt
                  ? t("cierre.estado.cerrado", { fecha: fecha(c!.cerradoAt) })
                  : t("cierre.estado.abierto", { fecha: enFrase(c!.fin) })}
            </p>
            {c!.cerradoAt && (
              <div className="flex flex-col gap-sm sm:flex-row">
                <Button variant="secondary" onClick={recerrar} disabled={volver.isPending}>
                  {volver.isPending ? t("cierre.volviendo") : t("cierre.volverACerrar")}
                </Button>
                <Button onClick={() => setAbierta({ accion: "destinar" })}>
                  {t("cierre.destinar")}
                </Button>
              </div>
            )}
          </div>
          <AvisoError error={volver.error} />

          <div className="grid items-start gap-lg md:grid-cols-2">
            <TarjetaSobrante
              titulo={t("cierre.salario.titulo")}
              detalle={t("cierre.salario.detalle", {
                salario: formatearPesos(c!.salario),
                presupuesto: formatearPesos(c!.salarioPresupuesto),
              })}
              sobrante={c!.sobranteSalario}
              destinado={c!.destinadoSalario}
              noDestinado={c!.noDestinadoSalario}
            />
            <TarjetaSobrante
              titulo={t("cierre.presupuesto.titulo")}
              detalle={t("cierre.presupuesto.detalle", {
                presupuesto: formatearPesos(c!.presupuesto),
                usado: formatearPesos(c!.presupuesto - c!.disponible),
              })}
              sobrante={c!.sobrantePresupuesto}
              destinado={c!.destinadoPresupuesto}
              noDestinado={c!.noDestinadoPresupuesto}
              excedido={c!.excedido}
            />
            <Bolsas cierre={c!} />
            <Destinos
              destinos={c!.destinos}
              alEditar={(destino) => setAbierta({ accion: "editar", destino })}
              alEliminar={(destino) => setAbierta({ accion: "eliminar", destino })}
            />
          </div>
        </>
      )}

      {c && abierta?.accion === "destinar" && (
        <DialogoDestinar abierta alCambiar={cerrar} cierre={c} />
      )}
      {abierta?.accion === "editar" && (
        <DialogoEditarDestino abierta alCambiar={cerrar} destino={abierta.destino} />
      )}
      {abierta?.accion === "eliminar" && (
        <DialogoEliminarDestino abierta alCambiar={cerrar} destino={abierta.destino} />
      )}
    </main>
  );
}

function Fila({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-md text-body-md", clase)}>
      <dt>{etiqueta}</dt>
      <dd className="font-mono tabular-nums">{formatearPesos(valor)}</dd>
    </div>
  );
}

function TarjetaSobrante(props: {
  titulo: string;
  detalle: string;
  sobrante: number;
  destinado: number;
  noDestinado: number;
  excedido?: number;
}) {
  const { t } = useTranslation();
  return (
    <section className={tarjeta} aria-label={props.titulo}>
      <div className="flex flex-col gap-xs">
        <h2 className="text-body-md text-muted-foreground">{props.titulo}</h2>
        <p className="font-mono text-headline-sm tabular-nums">{formatearPesos(props.sobrante)}</p>
        <p className="text-body-sm text-muted-foreground">{props.detalle}</p>
      </div>
      {Boolean(props.excedido) && (
        <Alert variant="warning" role="status">
          <CircleAlert aria-hidden="true" />
          <span>{t("cierre.excedido", { valor: formatearPesos(props.excedido!) })}</span>
        </Alert>
      )}
      <dl className="flex flex-col gap-sm border-t pt-sm">
        <Fila etiqueta={t("cierre.destinado")} valor={props.destinado} />
        <Fila
          etiqueta={t("cierre.noDestinado")}
          valor={props.noDestinado}
          clase={cn("text-title", props.noDestinado < 0 && "text-destructive")}
        />
      </dl>
      {props.noDestinado < 0 && (
        <Alert variant="error" role="status">
          <CircleAlert aria-hidden="true" />
          <span>{t("cierre.negativo")}</span>
        </Alert>
      )}
    </section>
  );
}

function Bolsas({ cierre }: { cierre: Cierre }) {
  const { t } = useTranslation();
  return (
    <section className={tarjeta} aria-labelledby="titulo-bolsas-cierre">
      <div className="flex flex-col gap-xs">
        <h2 id="titulo-bolsas-cierre" className="text-headline-sm">
          {t("cierre.bolsas.titulo")}
        </h2>
        <p className="text-body-sm text-muted-foreground">
          {cierre.cerradoAt ? t("cierre.bolsas.ayuda") : t("cierre.bolsas.vacio")}
        </p>
      </div>
      {cierre.bolsas.length > 0 && (
        <dl className="flex flex-col gap-sm">
          {cierre.bolsas.map((b) => (
            <Fila
              key={b.bolsaId}
              etiqueta={b.nombre}
              valor={b.saldo}
              clase={b.saldo < 0 ? "text-destructive" : undefined}
            />
          ))}
        </dl>
      )}
    </section>
  );
}

function Destinos(props: {
  destinos: Destino[];
  alEditar: (d: Destino) => void;
  alEliminar: (d: Destino) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={tarjeta} aria-labelledby="titulo-destinos">
      <h2 id="titulo-destinos" className="text-headline-sm">
        {t("cierre.destinos.titulo")}
      </h2>
      {props.destinos.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t("cierre.destinos.vacio")}</p>
      ) : (
        <ul className="flex flex-col">
          {props.destinos.map((d) => (
            <li key={d.id} className="flex items-center gap-sm border-t py-sm first:border-t-0">
              {d.metaId ? (
                <IconoCategoria icono={d.metaIcono ?? "piggy-bank"} color={null} />
              ) : (
                <span className="inline-flex size-touch shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground">
                  <Wallet aria-hidden="true" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-md">{d.nombre}</span>
                <span className="text-body-sm text-muted-foreground">
                  {t(`cierre.destinos.${d.origen}`)}
                </span>
              </div>
              <span className="font-mono tabular-nums">{formatearPesos(d.valor)}</span>
              <MenuAcciones
                titulo={d.nombre}
                etiqueta={t("comun.acciones", { nombre: d.nombre })}
                acciones={[
                  {
                    clave: "editar",
                    etiqueta: t("cierre.destinos.editar"),
                    icono: <Pencil aria-hidden="true" />,
                    alElegir: () => props.alEditar(d),
                  },
                  {
                    clave: "eliminar",
                    etiqueta: t("cierre.destinos.eliminar"),
                    icono: <Trash2 aria-hidden="true" />,
                    alElegir: () => props.alEliminar(d),
                    destructiva: true,
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

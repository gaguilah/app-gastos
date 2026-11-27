import { useId, useState } from "react";
import { CircleAlert, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvisoError } from "@/components/shared/AvisoError";
import { CampoMonto } from "@/components/shared/CampoMonto";
import { Ventana } from "@/components/shared/Ventana";
import { useMetas } from "@/datos/ahorros";
import { useBolsas } from "@/datos/bolsas";
import { useDestinarSobrante, type Cierre, type OrigenSobrante } from "@/datos/cierre";
import { formatearPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void; cierre: Cierre };

/** «meta:<id>» o «bolsa:<id>»; vacío mientras no se elige. */
type FilaDestino = { clave: number; destino: string; valor: number | null };

// Select nativo con el mismo aspecto que Input (DESIGN.md §4): en el móvil abre el selector del sistema.
const claseSelect =
  "h-campo w-full min-w-0 rounded-control border border-input bg-card px-md text-campo text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-2 aria-invalid:border-destructive";

function MensajeError({ id, texto }: { id: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <p id={id} className="flex items-center gap-xs text-body-sm text-destructive">
      <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
      {texto}
    </p>
  );
}

/**
 * Reparte un sobrante (del salario o del presupuesto) entre varias metas o bolsas (decisión 7, S7).
 * Lo que no se destina queda como «No destinado».
 */
export function DialogoDestinar({ abierta, alCambiar, cierre }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const destinar = useDestinarSobrante();
  const { data: metas } = useMetas();
  const { data: bolsas } = useBolsas();
  const disponible = {
    salario: Math.max(cierre.noDestinadoSalario, 0),
    presupuesto: Math.max(cierre.noDestinadoPresupuesto, 0),
  };
  const [origen, setOrigen] = useState<OrigenSobrante>(
    disponible.presupuesto > 0 || disponible.salario === 0 ? "presupuesto" : "salario",
  );
  const [filas, setFilas] = useState<FilaDestino[]>([{ clave: 0, destino: "", valor: null }]);
  const [intento, setIntento] = useState(false);

  const total = filas.reduce((suma, f) => suma + (f.valor ?? 0), 0);
  const restante = disponible[origen] - total;
  const cambiarFila = (clave: number, cambio: Partial<FilaDestino>) => {
    setFilas((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));
    destinar.reset();
  };
  const filaInvalida = (f: FilaDestino) => !f.destino || !f.valor || f.valor <= 0;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (disponible[origen] === 0 || filas.some(filaInvalida) || restante < 0) return;
    destinar.mutate(
      filas.map((f) => {
        const [tipo, destinoId = null] = f.destino.split(":");
        return {
          periodoId: cierre.periodoId,
          origen,
          valor: f.valor!,
          bolsaId: tipo === "bolsa" ? destinoId : null,
          metaId: tipo === "meta" ? destinoId : null,
        };
      }),
      {
        onSuccess: () => {
          toast.success(t("cierre.avisos.destinado"));
          alCambiar(false);
        },
      },
    );
  };

  return (
    <Ventana
      abierta={abierta}
      alCambiar={alCambiar}
      titulo={t("cierre.dialogo.titulo")}
      formulario
      pie={
        <>
          <Button variant="secondary" onClick={() => alCambiar(false)}>
            {t("comun.cancelar")}
          </Button>
          <Button type="submit" form="formulario-destinar" disabled={destinar.isPending}>
            {destinar.isPending ? t("comun.guardando") : t("cierre.destinar")}
          </Button>
        </>
      }
    >
      <form
        id="formulario-destinar"
        noValidate
        onSubmit={guardar}
        className="flex flex-col gap-md pb-md"
      >
        <fieldset className="flex flex-col gap-xs">
          <legend className="mb-xs text-body-md font-medium">{t("cierre.dialogo.origen")}</legend>
          <RadioGroup
            value={origen}
            onValueChange={(v) => {
              setOrigen(v as OrigenSobrante);
              destinar.reset();
            }}
            className="gap-xs"
          >
            {(["salario", "presupuesto"] as const).map((o) => (
              <label
                key={o}
                className="flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md text-body-md has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem value={o} />
                <span className="flex-1">
                  {t(`cierre.dialogo.origen${o === "salario" ? "Salario" : "Presupuesto"}`)}
                </span>
                <span className="font-mono text-body-sm tabular-nums text-muted-foreground">
                  {t("cierre.dialogo.quedan", { valor: formatearPesos(disponible[o]) })}
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        {disponible[origen] === 0 ? (
          <p role="status" className="text-body-sm text-muted-foreground">
            {t("cierre.dialogo.sinSobrante")}
          </p>
        ) : (
          <>
            {filas.map((f, i) => {
              const n = i + 1;
              const errorDestino =
                intento && !f.destino ? t("cierre.dialogo.destinoRequerido") : null;
              return (
                <div
                  key={f.clave}
                  role="group"
                  aria-labelledby={`${id}-${f.clave}-titulo`}
                  className="flex flex-col gap-sm rounded-card border p-md"
                >
                  <div className="flex items-center justify-between gap-sm">
                    <p id={`${id}-${f.clave}-titulo`} className="text-body-md font-medium">
                      {t("cierre.dialogo.destino", { n })}
                    </p>
                    {filas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("cierre.dialogo.quitar", { n })}
                        onClick={() =>
                          setFilas((actuales) => actuales.filter((x) => x.clave !== f.clave))
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-xs">
                    <Label htmlFor={`${id}-${f.clave}`} className="sr-only">
                      {t("cierre.dialogo.destino", { n })}
                    </Label>
                    <select
                      id={`${id}-${f.clave}`}
                      className={cn(claseSelect, !f.destino && "text-muted-foreground")}
                      value={f.destino}
                      aria-invalid={Boolean(errorDestino) || undefined}
                      aria-describedby={errorDestino ? `${id}-${f.clave}-error` : undefined}
                      onChange={(e) => cambiarFila(f.clave, { destino: e.target.value })}
                    >
                      <option value="" disabled>
                        {t("cierre.dialogo.elegir")}
                      </option>
                      {Boolean(metas?.length) && (
                        <optgroup label={t("cierre.dialogo.metas")}>
                          {metas!.map((m) => (
                            <option key={m.id} value={`meta:${m.id}`}>
                              {m.nombre}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={t("cierre.dialogo.bolsas")}>
                        {bolsas?.map((b) => (
                          <option key={b.id} value={`bolsa:${b.id}`}>
                            {b.nombre}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <MensajeError id={`${id}-${f.clave}-error`} texto={errorDestino} />
                  </div>
                  <CampoMonto
                    etiqueta={t("cierre.dialogo.valor", { n })}
                    valor={f.valor}
                    alCambiar={(valor) => cambiarFila(f.clave, { valor })}
                    error={intento && !f.valor ? t("cierre.dialogo.valorRequerido") : null}
                  />
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              onClick={() =>
                setFilas((actuales) => [
                  ...actuales,
                  {
                    clave: Math.max(...actuales.map((x) => x.clave)) + 1,
                    destino: "",
                    valor: null,
                  },
                ])
              }
            >
              <Plus aria-hidden="true" />
              {t("cierre.dialogo.agregar")}
            </Button>
            <p
              role="status"
              className={cn(
                "font-mono text-body-md tabular-nums",
                restante < 0 && "text-destructive",
              )}
            >
              {restante < 0
                ? t("cierre.dialogo.excede", { valor: formatearPesos(-restante) })
                : t("cierre.dialogo.restante", { valor: formatearPesos(restante) })}
            </p>
          </>
        )}
        <AvisoError error={destinar.error} />
      </form>
    </Ventana>
  );
}

import { useId, type ReactNode } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useBolsas } from "@/datos/bolsas";
import { formatearPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";

/** Opción que no es una bolsa, como «Presupuesto del período» en el destino de un ingreso. */
export type OpcionExtra = { valor: string; etiqueta: string; ayuda?: string };

type Props = {
  etiqueta: string;
  valor: string | null;
  alCambiar: (valor: string) => void;
  /** Van antes de las bolsas. */
  extras?: OpcionExtra[];
  /** Bolsas que no se ofrecen, por ejemplo el origen de un traslado. */
  excluir?: string[];
  /** Lo que saldría de la bolsa elegida: si la deja en negativo, se avisa antes de guardar (3.4). */
  salida?: number | null;
  /** Mensaje ya traducido. */
  error?: string | null;
};

/** Bolsas con su saldo, «Efectivo · quedan $35.000» (DESIGN.md §4 · Selector de bolsa). */
export function SelectorBolsa({
  etiqueta,
  valor,
  alCambiar,
  extras = [],
  excluir = [],
  salida,
  error,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const { data: bolsas, isPending, isError } = useBolsas();
  const visibles = (bolsas ?? []).filter((b) => !excluir.includes(b.id));
  const elegida = visibles.find((b) => b.id === valor);
  const quedaria = elegida && salida ? elegida.saldo - salida : null;

  return (
    <div role="group" aria-labelledby={`${id}-etiqueta`} className="flex flex-col gap-xs">
      <Label id={`${id}-etiqueta`} asChild>
        <span>{etiqueta}</span>
      </Label>
      <RadioGroup
        value={valor ?? ""}
        onValueChange={alCambiar}
        aria-labelledby={`${id}-etiqueta`}
        aria-invalid={Boolean(error) || undefined}
        className="gap-xs"
      >
        {extras.map((o) => (
          <Fila key={o.valor} valor={o.valor} activa={valor === o.valor}>
            <span className="flex flex-col">
              <span className="text-body-md font-medium">{o.etiqueta}</span>
              {o.ayuda && <span className="text-body-sm text-muted-foreground">{o.ayuda}</span>}
            </span>
          </Fila>
        ))}
        {isPending && (
          <div className="flex flex-col gap-xs" aria-label={t("app.cargando")}>
            <Skeleton className="h-touch" />
            <Skeleton className="h-touch" />
          </div>
        )}
        {visibles.map((b) => (
          <Fila key={b.id} valor={b.id} activa={valor === b.id}>
            <span className="text-body-md font-medium">{b.nombre}</span>
            <span
              className={cn(
                "ml-auto font-mono text-label-numeric",
                b.saldo < 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {t("bolsas.selector.quedan", { saldo: formatearPesos(b.saldo) })}
            </span>
          </Fila>
        ))}
      </RadioGroup>
      {isError && <p className="text-body-sm text-destructive">{t("bolsas.selector.error")}</p>}
      {quedaria !== null && quedaria < 0 && elegida && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <span>
            {t("bolsas.selector.quedaNegativo", {
              nombre: elegida.nombre,
              saldo: formatearPesos(quedaria),
            })}
          </span>
        </Alert>
      )}
      {error && (
        <p className="flex items-center gap-xs text-body-sm text-destructive">
          <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function Fila({
  valor,
  activa,
  children,
}: {
  valor: string;
  activa: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-touch cursor-pointer items-center gap-sm rounded-control border px-md py-sm",
        activa && "border-primary bg-accent",
      )}
    >
      <RadioGroupItem value={valor} />
      {children}
    </label>
  );
}

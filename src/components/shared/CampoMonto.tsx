import { useId, useState, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearPesos, leerPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";

type Props = {
  etiqueta: string;
  /** Pesos enteros; null mientras el campo está vacío o no es un monto válido. */
  valor: number | null;
  alCambiar: (valor: number | null) => void;
  /** Mensaje ya traducido; marca el campo con aria-invalid. */
  error?: string | null;
  /** Línea de ayuda debajo, por ejemplo el saldo de la bolsa. */
  ayuda?: ReactNode;
  /** Acepta montos negativos (ajuste del presupuesto). */
  negativo?: boolean;
  autoFocus?: boolean;
  name?: string;
  onBlur?: () => void;
};

const mostrar = (valor: number | null) =>
  valor === null ? "" : formatearPesos(valor).replace("$", "");

/** Monto en COP (DESIGN.md §4): mono grande, teclado numérico, puntos de miles mientras se escribe. */
export function CampoMonto({
  etiqueta,
  valor,
  alCambiar,
  error,
  ayuda,
  negativo,
  ...props
}: Props) {
  const id = useId();
  const [texto, setTexto] = useState(() => mostrar(valor));
  // Si el valor cambia desde afuera (reiniciar el formulario), el texto lo sigue.
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    if (leerPesos(texto, { negativo }) !== valor) setTexto(mostrar(valor));
  }

  function cambiar(entrada: string) {
    const signo = negativo && /^\s*[-−]/.test(entrada) ? "−" : "";
    const digitos = entrada.replace(/\D/g, "");
    const leido = digitos === "" ? null : leerPesos(`${signo}${digitos}`, { negativo });
    setTexto(leido === null ? `${signo}${digitos}` : mostrar(leido));
    setAnterior(leido);
    alCambiar(leido);
  }

  const descripcion = [error && `${id}-error`, ayuda && `${id}-ayuda`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-md flex items-center font-mono text-amount-kpi text-muted-foreground"
        >
          $
        </span>
        <Input
          id={id}
          type="text"
          inputMode={negativo ? "text" : "numeric"}
          autoComplete="off"
          value={texto}
          onChange={(e) => cambiar(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={descripcion || undefined}
          className={cn("pl-xl font-mono text-amount-kpi")}
          {...props}
        />
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-body-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-xs text-body-sm text-destructive">
          <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

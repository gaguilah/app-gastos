import { useId, useState, type ComponentProps } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = ComponentProps<typeof Input> & {
  etiqueta: string;
  /** Mensaje ya traducido; marca el campo con aria-invalid. */
  error?: string | null;
  /** Solo marca el campo (el mensaje está en un aviso común del formulario). */
  invalido?: boolean;
};

/** Campo con etiqueta visible y error con ícono (DESIGN.md §4 · Campo). */
export function Campo({ etiqueta, error, invalido, type, ...props }: Props) {
  const id = useId();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const esContrasena = type === "password";

  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex gap-sm">
        <Input
          id={id}
          type={esContrasena && visible ? "text" : type}
          aria-invalid={Boolean(error) || invalido || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {esContrasena && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-campo"
            aria-label={t(visible ? "login.ocultarContrasena" : "login.mostrarContrasena")}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-xs text-body-sm text-destructive">
          <CircleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

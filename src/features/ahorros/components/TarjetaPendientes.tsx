import { Check, Pencil, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvisoError } from "@/components/shared/AvisoError";
import { MenuAcciones } from "@/components/shared/MenuAcciones";
import { useConfirmarAporte, type Pendiente } from "@/datos/ahorros";
import { formatearPesos } from "@/dominio/dinero";
import { fechaCorta } from "@/dominio/fechas";

type Props = {
  pendientes: Pendiente[];
  hoy: string;
  alAjustar: (p: Pendiente) => void;
  alOmitir: (p: Pendiente) => void;
};

/** Aportes periódicos generados que esperan confirmación (3.15). */
export function TarjetaPendientes({ pendientes, hoy, alAjustar, alOmitir }: Props) {
  const { t, i18n } = useTranslation();
  const confirmar = useConfirmarAporte();
  const fecha = (dia: string) => {
    const f = fechaCorta(dia, hoy, i18n.language);
    return "clave" in f ? t(f.clave) : f.texto;
  };

  return (
    <section
      aria-labelledby="titulo-pendientes"
      className="flex flex-col gap-sm rounded-card border bg-warning-soft p-md"
    >
      <h2 id="titulo-pendientes" className="text-title">
        {t("ahorros.pendientes.titulo")}
      </h2>
      <ul className="flex flex-col gap-sm">
        {pendientes.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-sm rounded-card border bg-card p-sm"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <span className="text-body-md">
                {t("ahorros.pendientes.aporteA", { nombre: p.metaNombre })}
              </span>
              <span className="text-body-sm text-muted-foreground">
                {p.origenNombre
                  ? t("ahorros.pendientes.desde", { fecha: fecha(p.fecha), origen: p.origenNombre })
                  : fecha(p.fecha)}
              </span>
            </div>
            <span className="font-mono text-body-md tabular-nums">{formatearPesos(p.valor)}</span>
            <Badge variant="pending">{t("ahorros.pendientes.pendiente")}</Badge>
            <div className="flex items-center gap-xs">
              <Button
                disabled={confirmar.isPending}
                onClick={() =>
                  confirmar.mutate(
                    { id: p.id },
                    { onSuccess: () => toast.success(t("ahorros.avisos.confirmado")) },
                  )
                }
              >
                <Check aria-hidden="true" />
                {t("ahorros.pendientes.confirmar")}
              </Button>
              <MenuAcciones
                titulo={t("ahorros.pendientes.aporteA", { nombre: p.metaNombre })}
                etiqueta={t("ahorros.pendientes.acciones", { nombre: p.metaNombre })}
                acciones={[
                  {
                    clave: "ajustar",
                    etiqueta: t("ahorros.pendientes.ajustar"),
                    icono: <Pencil aria-hidden="true" />,
                    alElegir: () => alAjustar(p),
                  },
                  {
                    clave: "omitir",
                    etiqueta: t("ahorros.pendientes.omitir"),
                    icono: <SkipForward aria-hidden="true" />,
                    alElegir: () => alOmitir(p),
                  },
                ]}
              />
            </div>
          </li>
        ))}
      </ul>
      <AvisoError error={confirmar.error} />
    </section>
  );
}

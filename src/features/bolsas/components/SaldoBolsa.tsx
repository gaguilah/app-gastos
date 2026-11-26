import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatearPesos } from "@/dominio/dinero";
import { cn } from "@/lib/utils";

/** Saldo en mono; si es negativo, con su signo, en warning y con la palabra (3.4). */
export function SaldoBolsa({ saldo, className }: { saldo: number; className?: string }) {
  const { t } = useTranslation();
  if (saldo >= 0) {
    return <span className={cn("font-mono tabular-nums", className)}>{formatearPesos(saldo)}</span>;
  }
  return (
    <span className={cn("inline-flex flex-col items-end gap-xs text-warning-ink", className)}>
      <span className="font-mono tabular-nums">{formatearPesos(saldo)}</span>
      <span className="inline-flex items-center gap-xs text-body-sm">
        <TriangleAlert className="size-icono-sm shrink-0" aria-hidden="true" />
        {t("bolsas.negativo")}
      </span>
    </span>
  );
}

import { GitMerge, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MenuAcciones, type Accion } from "@/components/shared/MenuAcciones";
import type { Elemento, Lista } from "@/datos/listas";
import { useEsComputador } from "@/lib/useEsComputador";
import { candidatosUnir, nombreVisible, resumenUso, ultimoUso } from "../textos";

export type AccionLista = "renombrar" | "unir" | "eliminar";

type Props = {
  lista: Lista;
  elementos: Elemento[];
  hoy: string;
  alElegir: (accion: AccionLista, elemento: Elemento) => void;
};

const columnaUsos = {
  formas: "listas.columnas.usosFormas",
  lugares: "listas.columnas.usosLugares",
  personas: "listas.columnas.usosPersonas",
} as const;

/** Tabla en computador y tarjetas en móvil y tablet (DESIGN.md §3). */
export function ListaElementos({ lista, elementos, hoy, alElegir }: Props) {
  const { t, i18n } = useTranslation();
  const esComputador = useEsComputador();

  const menu = (e: Elemento) => {
    const nombre = nombreVisible(e, t);
    const acciones: Accion[] = [
      {
        clave: "renombrar",
        etiqueta: t("listas.acciones.renombrar"),
        icono: <Pencil aria-hidden="true" />,
        alElegir: () => alElegir("renombrar", e),
      },
      {
        clave: "unir",
        etiqueta: t("listas.acciones.unir"),
        icono: <GitMerge aria-hidden="true" />,
        alElegir: () => alElegir("unir", e),
        deshabilitada:
          candidatosUnir(e, elementos).length === 0 ? t("listas.acciones.sinOtro") : undefined,
      },
      {
        clave: "eliminar",
        etiqueta: t("listas.acciones.eliminar"),
        icono: <Trash2 aria-hidden="true" />,
        alElegir: () => alElegir("eliminar", e),
        destructiva: true,
      },
    ];
    return (
      <MenuAcciones
        titulo={nombre}
        etiqueta={t("comun.acciones", { nombre })}
        acciones={acciones}
      />
    );
  };
  // Bancos y tarjetas llevan su insignia; las personas no la necesitan.
  const insignia = (e: Elemento) =>
    lista === "personas" && e.subtipo !== "persona" && e.subtipo ? (
      <Badge>{t(`listas.subtipos.${e.subtipo}`)}</Badge>
    ) : null;

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(`listas.columnas.${lista}`)}</TableHead>
              <TableHead className="text-right">{t(columnaUsos[lista])}</TableHead>
              <TableHead>{t("listas.columnas.ultimo")}</TableHead>
              <TableHead className="w-touch">
                <span className="sr-only">{t("listas.columnas.acciones")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elementos.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-sm">
                    <span className="text-title">{nombreVisible(e, t)}</span>
                    {insignia(e)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{e.usos}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ultimoUso(e, hoy, t, i18n.language) ?? t("listas.sinUso")}
                </TableCell>
                <TableCell>{menu(e)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {elementos.map((e) => (
        <li key={e.id} className="flex items-center gap-sm rounded-card border bg-card p-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <span className="flex flex-wrap items-center gap-sm">
              <span className="text-title">{nombreVisible(e, t)}</span>
              {insignia(e)}
            </span>
            <span className="text-body-sm text-muted-foreground">
              {resumenUso(e, lista, hoy, t, i18n.language)}
            </span>
          </div>
          {menu(e)}
        </li>
      ))}
    </ul>
  );
}

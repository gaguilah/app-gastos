import { FolderPlus, Pencil, Trash2 } from "lucide-react";
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
import { IconoCategoria } from "@/components/shared/IconoCategoria";
import { MenuAcciones, type Accion } from "@/components/shared/MenuAcciones";
import type { Categoria } from "@/datos/categorias";
import { useEsComputador } from "@/lib/useEsComputador";

export type AccionCategoria = "editar" | "agregarSub" | "eliminar";

type Props = {
  categorias: Categoria[];
  alElegir: (accion: AccionCategoria, categoria: Categoria) => void;
};

/** Tabla en computador y tarjetas en móvil y tablet (DESIGN.md §3). */
export function ListaCategorias({ categorias, alElegir }: Props) {
  const { t } = useTranslation();
  const esComputador = useEsComputador();

  const acciones = (c: Categoria): Accion[] => [
    {
      clave: "editar",
      etiqueta: t("categorias.acciones.editar"),
      icono: <Pencil aria-hidden="true" />,
      alElegir: () => alElegir("editar", c),
    },
    {
      clave: "agregarSub",
      etiqueta: t("categorias.acciones.agregarSub"),
      icono: <FolderPlus aria-hidden="true" />,
      alElegir: () => alElegir("agregarSub", c),
    },
    {
      clave: "eliminar",
      etiqueta: t("categorias.acciones.eliminar"),
      icono: <Trash2 aria-hidden="true" />,
      alElegir: () => alElegir("eliminar", c),
      destructiva: true,
      deshabilitada: c.delSistema ? t("categorias.acciones.noSeElimina") : undefined,
    },
  ];

  const menu = (c: Categoria) => (
    <MenuAcciones
      titulo={c.nombre}
      etiqueta={t("comun.acciones", { nombre: c.nombre })}
      acciones={acciones(c)}
    />
  );
  const subcategorias = (c: Categoria) =>
    c.subcategorias.length > 0
      ? c.subcategorias.map((s) => s.nombre).join(", ")
      : t("categorias.sinSubcategorias");
  const origen = (c: Categoria) => (
    <Badge variant={c.delSistema ? "neutral" : "ok"}>
      {t(c.delSistema ? "categorias.delSistema" : "categorias.propia")}
    </Badge>
  );

  if (esComputador) {
    return (
      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("categorias.columnas.categoria")}</TableHead>
              <TableHead>{t("categorias.columnas.subcategorias")}</TableHead>
              <TableHead className="text-right">{t("categorias.columnas.movimientos")}</TableHead>
              <TableHead>{t("categorias.columnas.tipo")}</TableHead>
              <TableHead className="w-touch">
                <span className="sr-only">{t("categorias.columnas.acciones")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="flex items-center gap-sm">
                    <IconoCategoria icono={c.icono} color={c.color} />
                    <span className="text-title">{c.nombre}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{subcategorias(c)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{c.usos}</TableCell>
                <TableCell>{origen(c)}</TableCell>
                <TableCell>{menu(c)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="grid gap-sm md:grid-cols-2">
      {categorias.map((c) => (
        <li key={c.id} className="flex items-start gap-sm rounded-card border bg-card p-md">
          <IconoCategoria icono={c.icono} color={c.color} />
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <span className="flex flex-wrap items-center gap-sm">
              <span className="text-title">{c.nombre}</span>
              {origen(c)}
            </span>
            <span className="text-body-sm text-muted-foreground">{subcategorias(c)}</span>
            <span className="text-body-sm text-muted-foreground">
              {t("categorias.movimientos", { count: c.usos })}
            </span>
          </div>
          {menu(c)}
        </li>
      ))}
    </ul>
  );
}

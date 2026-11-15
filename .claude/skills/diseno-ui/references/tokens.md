# Tokens de diseño

Extraídos de `docs/design/referencias/Example*.html` (generados con Stitch, sistema tipo Material 3). Valen hasta que `DESIGN.md` los reemplace en la Etapa 1.

Los tokens se definen como variables CSS con los nombres de shadcn/ui (`--background`, `--primary`, …) en `src/index.css`: `:root` para el modo claro y `.dark` para el oscuro. Tailwind los lee desde ahí. Ningún componente usa un valor fijo.

## Color

Los ejemplos solo traen el modo oscuro, que se conserva tal cual para la fase futura. El modo claro es una **propuesta derivada** con el mismo matiz (verde esmeralda + índigo); su contraste se valida en la Etapa 1.

| Token shadcn | Rol | Claro (MVP, propuesta) | Oscuro (ejemplos) | Nombre M3 en los ejemplos |
| --- | --- | --- | --- | --- |
| `--background` | Fondo de la app | `#f6f8f7` | `#0f131c` | background / surface |
| `--foreground` | Texto principal | `#161c19` | `#dfe2ef` | on-surface |
| `--card` | Tarjetas | `#ffffff` | `#1c1f29` | surface-container |
| `--card-foreground` | Texto en tarjetas | `#161c19` | `#dfe2ef` | on-surface |
| `--popover` | Menús, diálogos | `#ffffff` | `#262a34` | surface-container-high |
| `--muted` | Fondos suaves, filas alternas | `#eaefec` | `#181b25` | surface-container-low |
| `--muted-foreground` | Texto secundario | `#3c4a42` | `#bbcabf` | on-surface-variant |
| `--primary` | Acción principal, marca | `#047857` | `#4edea3` | primary |
| `--primary-foreground` | Texto sobre primary | `#ffffff` | `#003824` | on-primary |
| `--secondary` | Acento secundario | `#4343c8` | `#c0c1ff` | secondary |
| `--secondary-foreground` | Texto sobre secondary | `#ffffff` | `#1000a9` | on-secondary |
| `--accent` | Hover, seleccionado | `#d5f5e6` | `#31353f` | surface-container-highest |
| `--accent-foreground` | Texto sobre accent | `#00422b` | `#dfe2ef` | on-primary-container |
| `--border` | Bordes | `#bbcabf` | `#3c4a42` | outline-variant |
| `--input` | Borde de campos | `#86948a` | `#86948a` | outline |
| `--ring` | Foco | `#047857` | `#4edea3` | primary |
| `--destructive` | Error, presupuesto superado | `#ba1a1a` | `#ffb4ab` | error |
| `--success` | Ingresos, confirmado | `#047857` | `#27e0a9` | tertiary |
| `--warning` | Presupuesto ≥ 70 % | `#b45309` | `#fbbf24` | (nuevo) |

Contraste ya calculado de la paleta clara contra blanco: `--primary` 5.5:1, `--secondary` 7.3:1, `--warning` 5.0:1, `--destructive` 6.5:1, `--muted-foreground` 9.3:1 (8.0:1 sobre `--muted`) y `--input` 3.2:1 (borde de campo, mínimo 3:1). `--border` (1.7:1) es solo decorativo: no lo uses como único límite de un campo.

### Colores de gráficas

| Token | Claro | Oscuro | Uso sugerido |
| --- | --- | --- | --- |
| `--chart-1` | `#047857` | `#4edea3` | Serie principal, gasto |
| `--chart-2` | `#4343c8` | `#c0c1ff` | Comparación, período anterior |
| `--chart-3` | `#b45309` | `#fbbf24` | Tercera categoría |
| `--chart-4` | `#be185d` | `#f9a8d4` | Cuarta categoría |
| `--chart-5` | `#0e7490` | `#67e8f9` | Quinta categoría |

Las categorías tienen color propio editable (3.11). En la gráfica por categoría se usa el color de la categoría; si el usuario no eligió uno, se usa `--chart-n` en orden. Validar con la skill `dataviz` o `/impeccable audit` que los cinco se distingan entre sí y contra el fondo.

## Tipografía

- Texto: **Plus Jakarta Sans** (400, 500, 600, 700).
- Cifras, montos, porcentajes y etiquetas micro: **JetBrains Mono** (400, 500, 700), siempre con `tabular-nums`.
- Se cargan con `@fontsource` dentro del bundle (no desde Google Fonts) para que la PWA funcione sin conexión.

| Token | Tamaño / interlínea | Peso | Espaciado | Fuente |
| --- | --- | --- | --- | --- |
| `headline-xl` | 48 / 56 | 700 | -0.02em | Jakarta |
| `headline-xl-mobile` | 32 / 40 | 700 | -0.02em | Jakarta |
| `headline-lg` | 36 / 44 | 600 | -0.02em | Jakarta |
| `headline-lg-mobile` | 26 / 34 | 600 | -0.015em | Jakarta |
| `headline-md` | 24 / 32 | 600 | -0.01em | Jakarta |
| `headline-sm` | 20 / 28 | 600 | 0 | Jakarta |
| `body-lg` | 18 / 28 | 400 | 0 | Jakarta |
| `body-md` | 15 / 22 | 400 | 0 | Jakarta |
| `body-sm` | 13 / 18 | 400 | 0 | Jakarta |
| `label-tag` | 11 / 14 | 700 | 0.04em, mayúsculas | Jakarta |
| `label-numeric` | 14 / 20 | 500 | -0.01em | JetBrains Mono |
| `label-micro` | 10 / 12 | 500 | 0.06em | JetBrains Mono |

En móvil los campos de formulario usan al menos 16 px para que iOS no haga zoom al enfocarlos.

## Espaciado

| Token | Valor |
| --- | --- |
| `space-xs` | 0.25rem (4 px) |
| `space-sm` | 0.5rem (8 px) |
| `space-md` | 1rem (16 px) |
| `space-lg` | 1.5rem (24 px) |
| `space-xl` | 2.5rem (40 px) |
| `gutter-mobile` | 0.75rem (12 px) |
| `gutter` | 1.5rem (24 px) |
| `margin-mobile` | 1rem (16 px) |
| `margin` | 2rem (32 px) |

## Radios

| Token | Valor | Uso |
| --- | --- | --- |
| `rounded` | 0.25rem | Chips pequeños |
| `rounded-lg` | 0.5rem | Campos, botones |
| `rounded-xl` | 0.75rem | Tarjetas |
| `rounded-2xl` | 1rem | Paneles grandes, hojas inferiores |
| `rounded-full` | 9999px | Avatares, botón flotante, insignias |

## Superficies

Los ejemplos separan niveles con fondos (`surface-container-low` → `highest`) más que con sombras. En claro se mantiene la misma idea: `--background` < `--card` < `--popover`, con borde `--border` de 1 px y sombra solo en elementos flotantes (menús, botón flotante, hojas).

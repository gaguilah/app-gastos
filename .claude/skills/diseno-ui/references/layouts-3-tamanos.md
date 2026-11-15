# Layouts en tres tamaños

Un solo código con diseño adaptable (sección 6 del plan). Cada pantalla se revisa en los tres tamaños y en los dos modos (navegador e instalada).

| Tamaño | Ancho | Punto de corte Tailwind | Viewport de prueba (Playwright) |
| --- | --- | --- | --- |
| Móvil | < 768 px | base | 390 × 844 (iPhone 14) y 412 × 915 (Pixel 7) |
| Tablet | 768–1279 px | `md:` | 820 × 1180 (iPad Air) |
| Computador | ≥ 1280 px | `xl:` | 1440 × 900 |

## Móvil

- Una columna, márgenes `margin-mobile`, separación `gutter-mobile`.
- **Navegación inferior** fija con 4–5 destinos: Inicio (panel), Gastos, botón central para registrar, Reportes, Más (préstamos, deudas, bolsas, categorías, ajustes).
- **Botón flotante** para registrar gasto cuando no hay botón central.
- Gastos en **tarjetas** agrupadas por día; acciones con deslizamiento o menú de la tarjeta, nunca solo con hover.
- Formularios en pantalla completa o en hoja inferior (`Drawer` de shadcn).
- Filtros en una hoja inferior con un chip que resume los filtros activos.
- Respetar `env(safe-area-inset-top/bottom)` en modo instalado.

## Tablet

- **Dos columnas**: lista y detalle (por ejemplo, la lista de gastos a la izquierda y el detalle o el formulario a la derecha).
- **Menú lateral plegable** (solo íconos al plegarse, con etiqueta en tooltip).
- Áreas táctiles del tamaño de un dedo (≥ 44 px), porque se usa con la mano.
- Filtros en un panel que se abre y cierra.

## Computador

- **Menú lateral fijo** con texto e ícono, como en los ejemplos.
- Panel con **varias gráficas** en rejilla (tipo bento, como `ExampleDashboard.html`).
- Gastos en **tabla** con columnas ordenables (título y lugar, categoría, origen, valor, fecha, acciones), como `ExampleGastos.html`.
- **Filtros visibles** en una barra sobre la tabla.
- Uso completo con teclado: orden de tabulación lógico, foco visible, atajos opcionales documentados (por ejemplo, `n` para nuevo gasto), `Esc` cierra diálogos.
- Ancho máximo del contenido para que las líneas de texto no se estiren de más.

## Correspondencia con los ejemplos

| Ejemplo | Pantalla de la app | Qué tomar |
| --- | --- | --- |
| `ExampleDashboard.html` | Panel principal (Etapa 11) | Tarjetas KPI (gastado, restante, promedio diario), barra del presupuesto, top de categorías, últimos gastos |
| `ExampleGastos.html` | Gastos y filtros (Etapa 7) | Barra de filtros, formulario lateral en computador, tabla, tarjetas de resumen |
| `ExampleCategorias.html` | Gestión de categorías (Etapa 5) | Constructor con vista previa en vivo, selector de ícono y color, lista de categorías |
| `ExampleResumen.html` | Reportes y cierre de período (Etapa 11) | Comparación entre períodos, métodos de pago, top de lugares, exportar PDF y Excel |

Los ejemplos son de computador. La versión móvil y la de tablet de cada pantalla se definen en la Etapa 1 siguiendo este documento.

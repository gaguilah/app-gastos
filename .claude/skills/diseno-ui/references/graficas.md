# Gráficas con shadcn charts

Decisión del 15-nov-2026: las gráficas se hacen con los **charts de shadcn/ui** (sobre Recharts). No se usa ECharts.

## Reglas

1. **Siempre `ChartContainer` + `ChartConfig`** de shadcn. En el `ChartConfig`, cada serie toma su color de un token: `color: "var(--chart-1)"`. Ningún hex en el código de una gráfica.
2. Por categoría, el color es el que el usuario eligió para esa categoría (guardado en la categoría o en la copia del gasto). Si no hay, se usa `--chart-1…5` en orden.
3. Estados del presupuesto con tokens de estado: `--primary` normal, `--warning` desde 70 %, `--destructive` desde 100 %.
4. **Tooltip** de shadcn (`ChartTooltipContent`) con el monto completo `$2.845.000` y el porcentaje. **Ejes** con monto abreviado (`$2,8 M`, `$450 mil`) mediante el mismo helper de formato.
5. **Leyenda** con `ChartLegendContent` cuando haya más de una serie; si hay más de 5 categorías, las menores se agrupan en "Otras".
6. Textos (títulos, series, "Otras") desde los archivos de traducción.
7. Cada gráfica tiene título visible, `accessibilityLayer` activado y una tabla o resumen en texto equivalente (ver `accesibilidad.md`).
8. Las gráficas deben poder exportarse al PDF (3.13); evita efectos que no se rendericen al capturarlas (gradientes con `url()` externos, animaciones en curso al exportar).
9. Los totales de una gráfica deben coincidir con los datos filtrados: la gráfica recibe datos ya calculados por la capa de dominio, no calcula sumas por su cuenta.

## Qué gráfica para cada dato (3.13)

| Dato | Gráfica | Notas |
| --- | --- | --- |
| Proporción del gasto por categoría | Barras horizontales ordenadas (preferida) o dona con total al centro | La barra se lee mejor en móvil; la dona solo con ≤ 5 segmentos |
| Comparación entre períodos | Barras verticales por período | El período actual resaltado con `--chart-1`, los anteriores con `--chart-2` |
| Gasto acumulado contra presupuesto | Área o línea acumulada por día + línea de referencia del presupuesto | Marcas en 70 % y 100 %; zona proyectada punteada |
| Gasto por forma de pago / bolsa | Barras horizontales | Igual que categorías |
| Saldo de una deuda en el tiempo | Línea escalonada | Cuotas futuras como proyección punteada |

Antes de diseñar una gráfica nueva, carga la skill `dataviz` si está disponible y valida la paleta.

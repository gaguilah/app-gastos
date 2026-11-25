---
name: diseno-ui
description: Guía de diseño UI/UX de App-Gastos (tokens de color, tipografía, espaciado, layouts en móvil/tablet/computador, componentes shadcn, íconos Lucide, gráficas shadcn charts, formato COP, estados y accesibilidad). Úsala siempre que se diseñe, construya o modifique una pantalla, un componente, una gráfica o un estilo, y en la Etapa 1 al preparar bocetos y DESIGN.md.
---

# Diseño UI/UX de App-Gastos

App web PWA de uso principal en el móvil, para controlar gastos en COP, en español (por defecto) e inglés. Stack de UI: React 19 + TypeScript, Tailwind CSS 4, shadcn/ui, íconos Lucide y gráficas con los charts de shadcn (Recharts 3). Las versiones exactas están en `CLAUDE.md`.

## Fuentes de verdad, en orden

1. **`docs/plan.md`** decide **qué** hay en cada pantalla (reglas y campos).
2. **`DESIGN.md`** en la raíz decide **cómo se ve** (aprobado al cerrar la Etapa 1, 18-nov-2026): tokens, layouts, componentes, estados e inventario de pantallas. Las pantallas detalladas están en el lienzo de Claude Design que enlaza.
3. **`references/tokens.md`** de esta skill: histórico. DESIGN.md lo reemplaza; si chocan, gana DESIGN.md.
4. **`docs/design/referencias/Example*.html`**: guía de **forma** (composición, jerarquía, densidad). No son una fuente de contenido.

### Qué tomar y qué no de los ejemplos

Tomar: tarjetas tipo *bento* con KPI, cifras en fuente monoespaciada, barras de progreso del presupuesto, chips de filtro, menú lateral en computador, tabla en computador y tarjetas en móvil, jerarquía de títulos, radios y espaciado.

**No** tomar:
- La marca "Kairo", "Plan Premium", "Sincronización bancaria", "Cifrado" ni textos de marketing.
- Funciones que el plan no tiene: límite de presupuesto por categoría (es mejora futura), sincronización con bancos, PSE como forma de pago fija (el usuario puede crearla por CRUD).
- Material Symbols ni emojis: los íconos son **Lucide**.
- Solo modo oscuro: el MVP es **modo claro**; el oscuro queda preparado con los mismos tokens (ver DESIGN.md §2).
- Formatos de número mezclados (`$2,845,000`): siempre `$2.845.000` (ver "Dinero y fechas").

## Organización de componentes

Estructura híbrida inspirada en diseño atómico (decidida el 15-nov-2026). Se compone de lo pequeño a lo grande, sin carpetas `atoms/molecules/organisms`:

| Nivel | Carpeta | Qué va ahí | Regla |
| --- | --- | --- | --- |
| Átomos | `src/components/ui/` | Componentes de shadcn (`Button`, `Input`, `Card`, `Dialog`, `Chart`, `Drawer`) | Se agregan con el CLI de shadcn y se ajustan solo con tokens. No metas lógica de negocio |
| Moléculas | `src/components/shared/` | Piezas reutilizables entre módulos: campo de monto COP, selector de categoría por tipo, selector de bolsa con saldo, chip de filtro, estado vacío | Solo sube aquí lo que usan dos módulos o más |
| Organismos | `src/features/<módulo>/components/` | Bloques de un módulo: formulario de gasto, tabla y tarjetas de gastos, tarjeta de deuda, constructor de categoría | Pueden usar `shared/` y `ui/`, nunca componentes de otro módulo |
| Pantallas | `src/routes/` | Pantallas y el layout común (navegación, encabezado) | Solo arman organismos y leen parámetros de la ruta; no tienen estilos propios complejos |

No discutas si algo es molécula u organismo: si es de un solo módulo, va en su `features/`; si lo comparten varios, va en `shared/`.

## Pantallas y acceso

- Todas las pantallas viven dentro del layout común protegido. Las únicas pantallas públicas son **inicio de sesión** (`/login`) y la recuperación de contraseña (`/recuperar`, `/nueva-contrasena`), con la misma tarjeta y sin la navegación de la app.
- **No hay pantalla de registro** ni enlace "Crear cuenta": la app es de un solo usuario. La pantalla de login solo pide correo y contraseña.
- El layout común muestra navegación inferior en móvil y menú lateral en tablet y computador (ver `references/layouts-3-tamanos.md`).
- Mientras se verifica la sesión al abrir la app, se muestra una pantalla de carga breve, no un parpadeo del login.

## Reglas de diseño

1. **Móvil primero.** Diseña a 360–390 px de ancho y luego amplía. Ver `references/layouts-3-tamanos.md` para móvil, tablet y computador.
2. **Solo tokens.** Ningún color, tamaño o radio va fijo en el código (`#10b981`, `text-[15px]`). Si falta un token, se agrega a los tokens, no al componente. Así el modo oscuro saldrá solo cambiando variables.
3. **shadcn/ui primero.** Antes de crear un componente, usa el de shadcn o un elemento HTML nativo (por ejemplo, `<input type="date">`). Los componentes propios viven en `src/components/` y se documentan en DESIGN.md.
4. **Cifras.** Montos y porcentajes con `font-mono` (JetBrains Mono) y `tabular-nums`, alineados a la derecha en tablas. Gasto en color neutro; los ingresos llevan el signo `+` y color `success`. No uses rojo para todo gasto: el rojo es para errores y para el presupuesto superado.
5. **Estado del presupuesto.** Barra de progreso y textos con tres estados ligados a las alertas del plan (3.2): normal (< 70 %), advertencia (≥ 70 %, `warning`), superado (≥ 100 %, `destructive`). Nunca solo por color: siempre con el porcentaje en texto.
6. **Formularios rápidos.** Registrar un gasto debe tomar pocos toques: el valor primero con teclado numérico (`inputMode="numeric"`), la fecha con hoy por defecto, el origen mostrando el saldo de la bolsa ("Efectivo · quedan $35.000") y solo las categorías del tipo correspondiente (3.3, 3.11).
7. **Estados obligatorios** en cada pantalla o lista: carga (esqueleto), vacío (qué hacer, con la acción principal), error (qué pasó y cómo reintentar), sin conexión (aviso claro, 6 · PWA) y "pendiente de confirmar" para periódicos y cuotas.
8. **Acciones destructivas** (borrar categoría, lugar o registro en uso) piden confirmación y explican qué se conserva del historial (3.11, 3.14).
9. **Textos** siempre desde los archivos de traducción, nunca escritos en el componente. Prueba que el inglés (más corto) y el español (más largo) no rompan el diseño.
10. **Áreas táctiles** de al menos 44 × 44 px; respeta `env(safe-area-inset-*)` en modo instalado (muesca y barra del sistema).

## Íconos (Lucide)

- Importa cada ícono por nombre (`import { Utensils } from "lucide-react"`) y guarda en la categoría solo el **nombre** del ícono (`"utensils"`).
- Un ícono que transmite algo sin texto al lado lleva `aria-label`; un ícono decorativo lleva `aria-hidden="true"`.
- Íconos iniciales sugeridos para las categorías del plan: Alimentación `utensils`, Transporte `car`, Hogar `house`, Servicios públicos `zap`, Salud `heart-pulse`, Educación `graduation-cap`, Entretenimiento `clapperboard`, Ropa `shirt`, Suscripciones `repeat`, Mascotas `paw-print`, Otros `ellipsis`, Gasto desconocido `circle-help`, tarjetas de crédito `credit-card`, préstamos `hand-coins`, pago de préstamos `landmark`, ingreso por préstamo `banknote`.

## Gráficas (shadcn charts)

Detalle en `references/graficas.md`. Lo esencial:
- Usa el componente `ChartContainer` de shadcn con su `ChartConfig`; los colores salen **solo** de los tokens `--chart-1` a `--chart-5` y de los tokens de estado. Nunca un color fijo en una gráfica.
- La gráfica depende del dato (3.13): proporción por categoría, comparación entre períodos y gasto acumulado contra presupuesto.
- Montos en formato COP abreviado en ejes (`$2,8 M`) y completo en el tooltip (`$2.845.000`).

## Dinero y fechas en pantalla

- Formato único con un helper compartido: `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })`. En inglés se muestra igual en COP, solo cambia el idioma del resto.
- Fechas cortas "24 oct" y relativas "Hoy", "Ayer" en listas; fecha completa en el detalle. Zona horaria `America/Bogota`.
- Las listas de gastos se agrupan por día con el total del día.

## Antes de dar por terminada una pantalla

1. Revisa la pantalla en los tres tamaños (ver `references/layouts-3-tamanos.md`).
2. Pasa `references/accesibilidad.md`.
3. Corre `/impeccable audit <pantalla>` y `/impeccable critique <pantalla>` y corrige lo P0 y P1. Impeccable complementa esta skill: si alguna sugerencia choca con estos tokens o con el plan, ganan los tokens y el plan.
4. Para el pulido final, `/impeccable polish <pantalla>` y `/impeccable harden <pantalla>` (errores, i18n, desbordes).

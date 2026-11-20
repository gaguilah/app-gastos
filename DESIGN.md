# DESIGN.md · App-Gastos

Cómo se ve y se usa App-Gastos. Lo aprueba Giovanni al cerrar la Etapa 1 y desde ahí es la fuente de verdad visual (CLAUDE.md, "Fuentes de verdad", punto 4). Reemplaza a `.claude/skills/diseno-ui/references/tokens.md`.

- **Pantallas:** lienzo de Claude Design [App-Gastos · Primera tanda](https://claude.ai/artifact/NQYDHYjenHaJBrSg7o6skm). Tiene 16 secciones, cada una en móvil (390), tablet (820) y computador (1440), con su menú ⋮, sus modales y sus estados de vacío, carga y error, en español e inglés.
- **Sistema de diseño:** [App-Gastos Design System](https://claude.ai/artifact/KeLyaiHYpr9p7wyvstXyfJ), con los tokens, la tipografía y las vistas previas de los componentes.
- **Brief de origen:** `etapa-1/brief-claude-design.md` (en los archivos del proyecto).

El plan (`docs/plan.md`) decide **qué** hay en cada pantalla. Este archivo decide **cómo se ve**.

## 1. Principios

1. **La cifra manda.** Lo primero que se ve es cuánto queda. Los montos van en monoespaciada con cifras tabulares.
2. **Calma, no alarma.** El gasto va en color neutro. El rojo es solo para errores y para el presupuesto superado.
3. **Pocos toques.** El formulario de gasto empieza por el valor, con teclado numérico, y la fecha es hoy por defecto.
4. **Nunca solo color.** El presupuesto lleva el porcentaje en texto y cada estado lleva una palabra.
5. **Móvil primero.** Se diseña a 390 px y luego se amplía.

## 2. Tokens

Se definen como variables CSS con los nombres de shadcn/ui en `src/index.css`: `:root` para el modo claro y `.dark` para el oscuro (preparado, fuera del MVP). Se exponen a Tailwind 4 con `@theme inline { --color-primary: var(--primary); … }`. Ningún componente usa un valor fijo.

### 2.1 Color

| Token | Rol | Claro (MVP) | Oscuro (futuro) |
| --- | --- | --- | --- |
| `background` | Fondo de la app | `#f6f8f7` | `#0f131c` |
| `foreground` | Texto principal y montos | `#161c19` | `#dfe2ef` |
| `card` | Tarjetas, menú lateral, barra inferior, campos | `#ffffff` | `#1c1f29` |
| `card-foreground` | Texto en tarjetas | `#161c19` | `#dfe2ef` |
| `popover` | Menús, diálogos, hojas | `#ffffff` | `#262a34` |
| `muted` | Barras, encabezados de tabla, separadores, esqueletos | `#eaefec` | `#181b25` |
| `muted-foreground` | Texto secundario | `#3c4a42` | `#bbcabf` |
| `primary` | Acción principal, marca, foco | `#047857` | `#4edea3` |
| `primary-foreground` | Texto sobre primary | `#ffffff` | `#003824` |
| `secondary` | Comparación con el período anterior | `#4343c8` | `#c0c1ff` |
| `secondary-foreground` | Texto sobre secondary | `#ffffff` | `#1000a9` |
| `accent` | Seleccionado: menú activo, chip activo, opción elegida | `#d5f5e6` | `#31353f` |
| `accent-foreground` | Texto sobre accent | `#00422b` | `#dfe2ef` |
| `border` | Bordes decorativos | `#bbcabf` | `#3c4a42` |
| `input` | Borde de campos, chips y botón secundario | `#86948a` | `#86948a` |
| `ring` | Foco | `#047857` | `#4edea3` |
| `destructive` | Error, borrar, presupuesto superado | `#ba1a1a` | `#ffb4ab` |
| `destructive-foreground` | Texto sobre destructive | `#ffffff` | `#410002` |
| `destructive-soft` | Fondo de avisos de error | `#fdeceb` | `#3b1a1a` |
| `success` | Ingresos y confirmado | `#047857` | `#27e0a9` |
| `warning` | Pendiente y avisos (el presupuesto usa `alerta-*`) | `#b45309` | `#fbbf24` |
| `warning-soft` | Fondo de avisos e insignia Pendiente | `#fdf0e1` | `#3a2a12` |
| `warning-ink` | Texto sobre warning-soft | `#7a3a05` | `#fbbf24` |
| `alerta-70` | Presupuesto ≥ 70 % | `#a16207` | `#fde047` |
| `alerta-75` | Presupuesto ≥ 75 % | `#a5560a` | `#fdd958` |
| `alerta-80` | Presupuesto ≥ 80 % | `#a94a0d` | `#fed168` |
| `alerta-85` | Presupuesto ≥ 85 % | `#ae3e10` | `#feca79` |
| `alerta-90` | Presupuesto ≥ 90 % | `#b23214` | `#fec38a` |
| `alerta-95` | Presupuesto ≥ 95 % | `#b62617` | `#ffbb9a` |
| `alerta-100` | Presupuesto al 100 % | `#ba1a1a` | `#ffb4ab` |
| `alerta-superado` | Presupuesto superado | `#93000a` | `#ff8a80` |
| `scrim` | Capa detrás de diálogos | `rgba(22,28,25,.45)` | `rgba(0,0,0,.6)` |

Contraste contra blanco: `primary` 5.5:1, `secondary` 7.3:1, `warning` 5.0:1, `destructive` 6.5:1, `muted-foreground` 9.3:1 e `input` 3.2:1. Las `alerta-*` van de 4.9:1 (`alerta-70`) a 9.4:1 (`alerta-superado`) contra blanco, y de 8.1:1 a 14.1:1 contra el fondo oscuro `#0f131c`; son un degradado de amarillo a rojo, un tono por umbral (decidido el 20-nov-2026, Etapa 3). `border` (1.7:1) es decorativo y nunca es el único límite de un campo.

**Gráficas:** `chart-1` `#047857` (gasto), `chart-2` `#4343c8` (período anterior, línea punteada), `chart-3` `#b45309`, `chart-4` `#be185d`, `chart-5` `#0e7490` y `chart-budget` `#86948a` (línea discontinua del presupuesto).

**Categorías:** cada categoría guarda su color, que el usuario puede editar. Los colores iniciales son Alimentación `#b45309`, Transporte `#4343c8`, Hogar `#047857`, Servicios `#0e7490`, Entretenimiento `#be185d`, Salud `#7c3aed`, Café `#92400e` y Otros `#3c4a42`. El ícono de categoría usa ese color sobre un fondo al 12 % (`color-mix`).

### 2.2 Tipografía

Plus Jakarta Sans (400, 500, 600 y 700) para el texto y JetBrains Mono (400, 500 y 700) para las cifras, con `tabular-nums`. Se cargan con `@fontsource` dentro del bundle para que funcionen sin conexión.

| Token | Tamaño / interlínea | Peso | Fuente | Uso |
| --- | --- | --- | --- | --- |
| `headline-xl` | 48/56 (móvil 32/40) | 700 | Jakarta | Título de pantalla |
| `headline-lg` | 36/44 (móvil y tablet 26/34) | 600 | Jakarta | Sección grande |
| `headline-md` | 24/32 | 600 | Jakarta | Diálogo, título en móvil |
| `headline-sm` | 20/28 | 600 | Jakarta | Tarjeta, estado vacío |
| `title` | 16/24 | 600 | Jakarta | Título de un gasto en la lista |
| `body-lg` | 18/28 | 400 | Jakarta | Texto destacado |
| `body-md` | 15/22 | 400 | Jakarta | Texto por defecto |
| `body-sm` | 13/18 | 400 | Jakarta | Secundario, ayudas, errores de campo |
| `label-tag` | 11/14, mayúsculas, +0.04em | 700 | Jakarta | Etiquetas de KPI y tabla, insignias |
| `amount-xl` | 32/40 | 700 | Mono | Disponible, valor del formulario |
| `amount-kpi` | 22/28 | 700 | Mono | Valor de tarjeta KPI |
| `label-numeric` | 14/20 | 500 | Mono | Montos en listas y tablas |
| `label-micro` | 10/12, +0.06em | 500 | Mono | Porcentajes, ejes |

En móvil los campos usan al menos 16 px para que iOS no haga zoom.

### 2.3 Espaciado, radios, medidas y sombras

- **Espaciado:** `space-xs` 4, `space-sm` 8, `space-md` 16, `space-lg` 24 y `space-xl` 40 px. El margen de página es de 16 px en móvil, 24 en tablet y 32 en computador. Las columnas se separan 12 px en móvil y 24 en computador.
- **Radios:** `radius-chip` 4 (chips, casillas), `radius-control` 8 (botones, campos, menús, ícono de categoría), `radius-card` 12 (tarjetas), `radius-sheet` 16 (diálogos, hojas) y `radius-full` (botón flotante, insignias, interruptores, barras).
- **Medidas:** `touch-target` 44, `field-height` 48, `fab-size` 56, `sidebar-width` 256 y `sidebar-mini` 72 px.
- **Sombras**, solo para lo flotante: `shadow-menu` `0 8px 24px rgba(22,28,25,.16)`, `shadow-sheet` `0 12px 32px rgba(22,28,25,.18)`, `shadow-dialog` `0 24px 48px rgba(22,28,25,.28)` y `shadow-fab` `0 6px 16px rgba(4,120,87,.35)`. Las tarjetas no llevan sombra: se separan con fondo y un borde de 1 px.

## 3. Layout en tres tamaños

| | Móvil (< 768) | Tablet (768–1279, `md:`) | Computador (≥ 1280, `xl:`) |
| --- | --- | --- | --- |
| Navegación | Barra inferior: Inicio, Gastos, **+ Registrar** (flotante central), Reportes y Más | Menú lateral plegado de 72 px, íconos con tooltip | Menú lateral fijo de 256 px con logo, botón Registrar gasto, ícono y texto |
| Contenido | Una columna | Dos columnas: lista y detalle | Rejilla bento y tablas |
| Listas | Tarjetas agrupadas por día con el total | Lista y detalle al lado | Tabla ordenable con filtros visibles arriba |
| Formularios | Pantalla completa u hoja inferior (`Drawer`) | Panel derecho | Diálogo (`Dialog`) o panel lateral |
| Menú ⋮ | Hoja inferior | Menú flotante | Menú flotante |
| Filtros | Hoja inferior y un chip que resume lo activo | Panel desplegable | Barra sobre la tabla |

- El menú «Más» (solo móvil) lleva a Ingresos, Bolsas, Ahorros, Categorías, Presupuesto y período, Periódicos, Préstamos, Deudas, Formas de pago, lugares y personas, y Ajustes.
- La app instalada respeta la muesca y la barra del sistema con `env(safe-area-inset-*)`.
- El login no muestra navegación: solo correo, contraseña e "Iniciar sesión". No hay registro.

## 4. Componentes

Átomos de shadcn en `src/components/ui/`, moléculas en `src/components/shared/` y organismos en `src/features/<módulo>/components/`. Las vistas previas están en el sistema de diseño.

| Componente | Base | Reglas |
| --- | --- | --- |
| Botón | shadcn `Button` | Variantes `primary` (una por pantalla), `secondary`, `ghost` y `destructive` (solo en confirmaciones). 44 px de alto. Cargando: ícono girando, deshabilitado y con texto. Deshabilitado: `muted`, sin opacidad |
| Campo | shadcn `Input` + `Label` | 48 px de alto, borde `input`, etiqueta visible. Error: borde de 2 px `destructive`, mensaje con ícono y `aria-invalid` |
| Campo de monto COP | molécula `shared/` | Mono grande, `inputMode="numeric"`, primer campo del formulario. La ayuda muestra el saldo de la bolsa |
| Selector de bolsa | molécula `shared/` | Opciones con saldo ("Efectivo · quedan $35.000"). Si la bolsa queda en negativo, aviso `warning` antes de guardar |
| Selector de categoría | molécula `shared/` | Solo categorías del tipo que toca, con ícono y color |
| Chip de filtro | shadcn `Toggle` | `radius-chip`, 44 px. Activo: `accent` con borde `primary` |
| Insignia | shadcn `Badge` | `pending` (Pendiente), `ok` (Confirmado), `neutral` (Sistema). Siempre con palabra |
| Barra de presupuesto | shadcn `Progress` | Normal < 70 %; desde el 70 % toma el token `alerta-*` del último umbral alcanzado (degradado amarillo→rojo) y `alerta-superado` por encima del 100 %. Siempre con el porcentaje escrito y "$gastado de $presupuesto" |
| Tarjeta KPI | shadcn `Card` | `label-tag`, valor `amount-kpi` y una línea de contexto. Dos por fila en móvil y cuatro en computador |
| Fila de movimiento | organismo de cada módulo | Ícono de categoría, título, "lugar · origen · canal", monto a la derecha. Ingreso con `+` y `success`. Pendiente con insignia |
| Aviso | shadcn `Alert` | `warning`, `error`, `success` y barra oscura de sin conexión. Ícono y texto |
| Estados | molécula `shared/` | Vacío (ícono, título, qué hacer, acción), error (qué pasó, Reintentar) y carga (`Skeleton` con la forma real) |
| Menú ⋮ | shadcn `DropdownMenu` / `Drawer` | Ítems de 44 px; el de borrar en `destructive` y separado |
| Diálogo y hoja | shadcn `Dialog` / `Drawer` | Encabezado con cerrar, cuerpo y pie con acciones. En móvil, hoja inferior con el pie fijo |
| Pestañas | shadcn `Tabs` | Activa en `primary` con subrayado de 2 px. Se desplazan en móvil |
| Interruptor, radio, casilla | shadcn `Switch`, `RadioGroup`, `Checkbox` | Encendido en `primary` |
| Selector de ícono y color | organismo de Categorías | Rejilla de íconos Lucide y muestras de 44 px. Vista previa en vivo |
| Tabla | shadcn `Table` | Encabezado `label-tag` sobre `muted`, montos alineados a la derecha, columnas ordenables, desplazamiento horizontal propio |
| Gráficas | charts de shadcn (Recharts) | Colores solo de `chart-*` y de la categoría. Ejes con `$2,8 M` y tooltip con `$2.845.000` |

## 5. Dinero, fechas y textos

- Montos en COP sin decimales con un solo helper: `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })` → `$2.845.000`. En inglés siguen en COP.
- Porcentajes con espacio: `62 %`.
- Fechas en listas: "Hoy", "Ayer" y "24 oct". En el detalle, la fecha completa. Zona `America/Bogota`.
- Voz: español de Colombia, de tú, frases cortas que dicen qué pasó y qué hacer. Sin marketing, sin emojis, sin signos de exclamación. Todo texto sale de `src/i18n/es.json` y `en.json`.

## 6. Estados obligatorios

Cada pantalla y lista tiene carga (esqueleto), vacío (qué hacer, con la acción principal), error (qué pasó y Reintentar), sin conexión (barra superior) y "pendiente de confirmar" para periódicos y cuotas. Las acciones destructivas piden confirmación y dicen qué se conserva del historial.

## 7. Íconos

[Lucide](https://lucide.dev), con trazo de 2 px y 20 px por defecto (16 en insignias, 24 en navegación y 32 en estados). La categoría guarda solo el nombre del ícono. Iniciales: Alimentación `utensils`, Transporte `car`, Hogar `house`, Servicios públicos `zap`, Salud `heart-pulse`, Educación `graduation-cap`, Entretenimiento `clapperboard`, Ropa `shirt`, Suscripciones `repeat`, Mascotas `paw-print`, Otros `ellipsis`, Gasto desconocido `circle-help`, Tarjeta de crédito `credit-card`, Préstamos `hand-coins`, Pago de préstamos `landmark` e Ingreso por préstamo `banknote`.

## 8. Accesibilidad

WCAG 2.2 AA: 4.5:1 en texto y 3:1 en bordes de campo e íconos con significado. El foco es visible con `ring` (2 px, separado 2 px). Las áreas táctiles miden al menos 44 × 44 px. Un ícono sin texto lleva `aria-label`. Todo se puede usar con teclado y nada depende solo del hover.

## 9. Inventario de pantallas e implementación

Cada sección se implementa como una tarea propia (sub-issue de su etapa), con su rama, su PR y la revisión de Giovanni.

| Sección del lienzo | Etapa |
| --- | --- |
| Login, layout común, menú «Más», Ajustes, Avisos globales | 4 · Base del frontend |
| Categorías; Formas de pago, lugares y personas | 5 · Gestión de datos |
| Presupuesto y período, Ingresos, Bolsas, **Ahorros** (módulo nuevo) | 6 · Presupuesto, ingresos y bolsas |
| Gastos | 7 · Gastos y filtros |
| Gastos periódicos | 8 · Gastos periódicos |
| Préstamos que hago, Deudas | 9 · Préstamos y deudas |
| Panel, Resumen | 11 · Panel, reportes y exportación |

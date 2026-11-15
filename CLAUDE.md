# CLAUDE.md · App-Gastos

App web PWA para registrar gastos personales que se descuentan de un presupuesto por período, con ingresos, bolsas de dinero (Efectivo, Nequi, Daviplata), gastos periódicos, préstamos y deudas. Uso principal en el móvil, un solo usuario por ahora, en pesos colombianos (COP), en español (por defecto) e inglés.

Responde siempre en **español**. Los requisitos completos están en [`docs/plan.md`](docs/plan.md); este archivo no los repite.

## Fuentes de verdad

1. Lo que el usuario diga en la conversación.
2. La especificación aprobada de la etapa (issue de GitHub con la etiqueta `spec`).
3. `docs/plan.md`: reglas de negocio (sección 3), modelo de datos (4), metodología (5), harness (6) y etapas (7).
4. `DESIGN.md` (cuando exista, desde la Etapa 1) y las skills de `.claude/skills/`.

Si dos fuentes chocan, gana la de número menor y la decisión se anota en la especificación para actualizar el plan al cerrar la etapa.

## Skills: revisa cuál aplica antes de actuar

Antes de empezar cualquier tarea, revisa qué skill aplica y cárgala. Si hay duda, cárgala.

| Situación | Skill |
| --- | --- |
| Empezar una etapa o una funcionalidad nueva | `especificar-etapa` (no se escribe código sin especificación aprobada) |
| Escribir o cambiar código, SQL, Edge Functions o configuración | `buenas-practicas` |
| Diseñar o tocar pantallas, componentes, gráficas o estilos | `diseno-ui` (+ `/impeccable audit` y `critique` antes de entregar) |
| Reglas de cálculo, pruebas, depurar una prueba que falla | `pruebas` (TDD obligatorio en las reglas de cálculo) |
| Antes de abrir o actualizar un PR | `revision-codigo` (`/ponytail-review` + checklist propio), o el agente `revisor` |
| Cerrar una etapa | `cierre-etapa` |

Plugins del proyecto (declarados en `.claude/settings.json`, no globales): **Impeccable** para revisión y pulido visual, y **Ponytail** en modo `full` (nunca `ultra`) para escribir el mínimo código correcto. Ninguno de los dos decide requisitos: el plan manda.

## Stack

Versiones estables verificadas en npm el **15-nov-2026**. Al iniciar la Etapa 0 se instalan con `npm install <paquete>@latest` y se vuelven a verificar; luego quedan fijadas en `package-lock.json`. No actualices una versión mayor sin especificación aprobada.

### Definido en el plan

| Capa | Paquete | Versión |
| --- | --- | --- |
| UI | `react`, `react-dom` | **19.3.1** |
| Estilos | `tailwindcss` + `@tailwindcss/vite` | **4.3.5** |
| Componentes | shadcn/ui (CLI `shadcn`) | 4.23.0 |
| Íconos | `lucide-react` | 1.73.0 |
| Gráficas | charts de shadcn sobre `recharts` | 3.10.1 |
| Lenguaje | `typescript` | **6.0.3** (ver nota) |
| Backend | Supabase: `@supabase/supabase-js` 2.119.0 y CLI `supabase` 3.1.0 | |
| Publicación | Netlify (versión de prueba por PR) | |
| Código y CI | GitHub + GitHub Actions + GitHub Projects | |

**Nota sobre TypeScript:** la última versión publicada es la 7.0.2, pero `typescript-eslint` 8.72.2 solo admite TypeScript `<6.1.0`. Se usa la 6.0.3 hasta que `typescript-eslint` admita la 7.

**Tailwind 4** se configura desde CSS (`@import "tailwindcss"` y `@theme` en `src/index.css`), sin `tailwind.config.js`. Los tokens de `diseno-ui` van ahí como variables CSS.

### Propuesto para la Etapa 0 (se confirma en su especificación)

| Uso | Paquete | Versión |
| --- | --- | --- |
| Build y servidor de desarrollo | `vite` + `@vitejs/plugin-react` | 8.3.8 · 6.3.0 |
| PWA | `vite-plugin-pwa` | 2.0.0 |
| Rutas | `react-router` | 8.5.1 |
| Datos del servidor | `@tanstack/react-query` | 5.107.1 |
| Formularios y validación | `react-hook-form` + `zod` | 7.92.0 · 4.6.7 |
| Idiomas | `i18next` + `react-i18next` | 27.1.2 · 18.0.1 |
| Pruebas unitarias y de componentes | `vitest` + `@testing-library/react` | 5.1.0 · 16.3.3 |
| E2E y accesibilidad | `@playwright/test` + `@axe-core/playwright` | 1.65.1 · 4.14.0 |
| Calidad | `eslint` + `typescript-eslint` + `prettier` | 10.15.0 · 8.72.2 · 3.10.1 |
| Fuentes sin conexión | `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono` | 5.3.0 |
| Node.js | LTS "Lithium" | 26.x (Vitest pide ≥ 22.12) |

## Forma de trabajo

Cada etapa sigue el ciclo de la sección 5 del plan:

1. **Especificar** (`especificar-etapa`) y **esperar la aprobación** del usuario.
2. **Rama propia** por etapa.
3. **Pruebas primero** en reglas de cálculo: períodos, periódicos, alertas, bolsas, préstamos, deudas, normalización de nombres y QR.
4. **Implementar** siguiendo `buenas-practicas` y `diseno-ui`.
5. **Correr todo el harness** y **revisar** (`revision-codigo`).
6. **PR** con enlace a la versión de prueba de Netlify y resumen escrito.
7. **Revisión del usuario** en móvil, tablet y computador; si algo no cumple, se vuelve a implementar.
8. **Cierre** (`cierre-etapa`).

## Reglas que nunca se rompen

Detalle y ejemplos en las skills; aquí solo la lista.

- Montos en **pesos enteros** (`bigint` / entero). Sin decimales ni `float`.
- **Saldos derivados** de los movimientos; nunca una columna de saldo escrita a mano.
- **RLS** activado en toda tabla, con políticas por operación y pruebas pgTAP.
- **Nunca datos de tarjeta** (número, vencimiento, CVV), en ningún lugar.
- **La foto del QR no se guarda** ni se envía.
- **Supabase local** para desarrollo y pruebas. El proyecto Supabase existente no se toca; el proyecto real de esta app solo recibe migraciones aprobadas.
- **Historial inmutable**: editar reglas, deudas o categorías no cambia lo ya registrado.
- **"Hoy" en `America/Bogota`**, desde un reloj inyectable; las pruebas usan reloj fijo.
- **Ningún texto visible** escrito en un componente: todo va en `src/i18n/es.json` y `en.json`.
- **Ningún color, tamaño o radio fijo**: solo tokens.
- **Nunca desactivar ni editar una prueba** para obtener verde.

## Lo que Claude no hace sin aprobación explícita del usuario

- Fusionar un PR, crear etiquetas de versión o hacer push a `main`.
- Aplicar migraciones, desplegar Edge Functions o cambiar secretos en el proyecto Supabase real.
- Publicar en producción en Netlify.
- Agregar una dependencia que la especificación no justifique o subir una versión mayor.

`.claude/settings.json` pide confirmación para estos comandos.

## Comandos

Se crean en la Etapa 0; hasta entonces el repositorio no tiene `package.json`. Nombres previstos:

```bash
npm run dev            # servidor de desarrollo
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm test               # Vitest (unitarias y componentes)
npm run e2e -- --trace off   # Playwright en móvil, tablet y computador
supabase start         # Supabase local
supabase db reset      # aplica migraciones y semilla desde cero
supabase test db       # pruebas pgTAP
```

Actualiza esta sección cuando la Etapa 0 los fije.

## Estructura prevista

```
src/dominio/     reglas de negocio puras (sin React, sin Supabase, sin Date.now())
src/datos/       acceso a Supabase y tipos generados
src/features/    una carpeta por sección (gastos, bolsas, periodicos, prestamos, deudas…)
src/components/  componentes compartidos (shadcn en components/ui)
src/i18n/        es.json y en.json
supabase/        migrations/, tests/, functions/, seed.sql
e2e/             pruebas Playwright y fixtures (facturas QR de ejemplo)
docs/            plan.md y design/referencias/
```

## Definición de terminado

Una tarea está terminada cuando el harness pasa, la revisión no tiene bloqueantes, los textos están en español e inglés y, si hay pantallas, se revisó en los tres tamaños. Una etapa está cerrada solo con los criterios de `cierre-etapa` y la aprobación del usuario.

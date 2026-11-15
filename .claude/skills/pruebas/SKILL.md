---
name: pruebas
description: Cómo probar App-Gastos con TDD y las seis capas del harness (estática, reglas de cálculo, base de datos/RLS con pgTAP, componentes, E2E en móvil/tablet/computador, accesibilidad e idiomas, y pruebas de PWA). Úsala al escribir o cambiar reglas de cálculo, migraciones, componentes o flujos, al escribir pruebas, al depurar una prueba que falla y antes de entregar cualquier cambio.
---

# Pruebas de App-Gastos

Ningún cambio llega a `main` sin pasar todas sus capas (sección 6 del plan). GitHub Actions bloquea la fusión si alguna falla.

## TDD en las reglas de cálculo

Para **períodos, periódicos, alertas, bolsas, préstamos, deudas, normalización de nombres y lectura del QR**:

1. Escribe primero las pruebas con los casos de la especificación y los casos borde mínimos de `references/unitarias.md`.
2. Córrelas y confirma que **fallan por la razón correcta** (no por un error de importación).
3. Implementa lo mínimo en `src/dominio/` para que pasen.
4. Refactoriza con las pruebas en verde.
5. Haz commit de las pruebas junto con el código (o antes), nunca después.

Nunca cambies una prueba para que pase sin que la especificación haya cambiado. Si una prueba parece equivocada, pregúntale al usuario.

## Las capas

| Capa | Herramienta (versiones en `CLAUDE.md`; se confirman en Etapa 0) | Dónde | Referencia |
| --- | --- | --- | --- |
| Calidad estática | `tsc --noEmit`, ESLint, Prettier, `impeccable detect` | Todo el repo | (esta página) |
| Reglas de cálculo | Vitest | `src/dominio/**/*.test.ts` | `references/unitarias.md` |
| Base de datos | pgTAP con `supabase test db` | `supabase/tests/*.test.sql` | `references/rls-pgtap.md` |
| Componentes | Vitest + Testing Library | junto al componente, `*.test.tsx` | (esta página) |
| E2E | Playwright, 3 tamaños | `e2e/*.spec.ts` | `references/e2e-playwright.md` |
| Accesibilidad e idiomas | `@axe-core/playwright`, prueba de claves es/en | `e2e/a11y.spec.ts`, `src/i18n/*.test.ts` | `references/e2e-playwright.md` |
| PWA (modo instalada) | Playwright + revisión manual | `e2e/pwa.spec.ts` | `references/pwa.md` |

## Reglas del harness

- **Reloj fijo** en toda prueba que dependa de la fecha: el dominio recibe `hoy` por parámetro; en componentes y E2E se fija el reloj (`vi.setSystemTime`, `page.clock.setFixedTime`). Ninguna prueba depende del día en que corre.
- **Datos propios**: semillas de prueba en `supabase/seed.sql` y facturas de ejemplo en `e2e/fixtures/qr/`. Nunca datos reales, nunca números de tarjeta (ni siquiera de prueba).
- **Todo contra Supabase local.** Antes de las pruebas de base de datos o E2E: `supabase start` y `supabase db reset`.
- **Pruebas independientes**: cada prueba crea sus datos o parte de la semilla, y no depende del orden.
- **Nombres en español** que describen la regla: `it("el período con inicio 15 va del 15 al 14 del mes siguiente")`.

## Pruebas de componentes

- Prueba lo que el usuario ve y hace (`getByRole`, `getByLabelText`), no detalles internos.
- Casos mínimos por formulario: validación de campos obligatorios, monto con formatos "35.000" y "$35.000", categorías filtradas por tipo (3.11), mensaje de error del servidor traducido.
- Mockea solo la capa `src/datos/`; no mockees `dominio/`.

## Qué correr antes de entregar

```bash
npm run typecheck && npm run lint && npm test         # estática + unitarias + componentes
supabase db reset && supabase test db                  # base de datos (si hubo cambios de SQL)
npm run e2e -- --trace off                             # E2E en los 3 tamaños (en cada PR)
```

Los nombres exactos de los scripts se fijan en la Etapa 0. Si una prueba falla, corrige el código o pregunta; nunca la desactives (`skip`, `only`, borrarla) para obtener verde.

# Harness de Claude Code · App-Gastos

Todo lo de esta carpeta aplica **solo a este proyecto**; nada se instala a nivel global.

## Skills (`.claude/skills/`)

| Skill | Cuándo se usa |
| --- | --- |
| `especificar-etapa` | Al iniciar una etapa o funcionalidad: issue con objetivo, reglas, criterios de aceptación y tareas. No se programa sin su aprobación |
| `diseno-ui` | Al diseñar o tocar pantallas, componentes, gráficas o estilos. Tokens, layouts en 3 tamaños, accesibilidad, gráficas shadcn |
| `buenas-practicas` | Al escribir cualquier código, SQL o Edge Function |
| `pruebas` | TDD en reglas de cálculo y las capas del harness (estática, unitarias, pgTAP, componentes, E2E, a11y/i18n, PWA) |
| `revision-codigo` | Antes de abrir o actualizar un PR: `/ponytail-review` + checklist propio |
| `cierre-etapa` | Definición de cierre, resumen escrito y `/ponytail-debt` |

## Agente (`.claude/agents/`)

- `revisor`: revisión independiente, de solo lectura, con la skill `revision-codigo`.

## Plugins del proyecto (`settings.json`)

Se declaran en `extraKnownMarketplaces` y `enabledPlugins`, así que solo se activan al abrir este repositorio. La primera vez, Claude Code pide confirmar la instalación.

- **Impeccable** (`pbakaus/impeccable`): revisión y pulido visual (`/impeccable audit`, `critique`, `polish`, `harden`, `adapt`, `document`). Complementa `diseno-ui`; los tokens de `diseno-ui` y el plan mandan. `IMPECCABLE_LIVE_COPY_AGENT=chat` evita que su modo *live* lance Claude sin permisos.
- **Ponytail** (`DietrichGebert/ponytail`): menos código correcto. Modo por defecto `full` (`PONYTAIL_DEFAULT_MODE`); no usar `ultra`. El plan manda sobre los requisitos.

## Permisos y hooks

- Piden confirmación: cambios al proyecto Supabase real (CLI y MCP), despliegue a producción en Netlify, `git push --force`, push directo a `main`, etiquetas, fusión de PR y edición de `.env`.
- Bloqueado: leer `.env`, `.env.local` y `.env.production`.
- `hooks/formatear-y-validar.sh`: tras cada edición corre Prettier y ESLint sobre el archivo. No hace nada hasta que exista `package.json` con dependencias instaladas (Etapa 0).

## Referencias

- `docs/plan.md`: plan del proyecto (fuente de verdad de los requisitos).
- `docs/design/referencias/Example*.html`: ejemplos de Stitch usados como guía de forma.

El `CLAUDE.md` se crea después, apoyándose en estas skills.

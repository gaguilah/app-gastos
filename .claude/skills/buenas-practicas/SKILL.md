---
name: buenas-practicas
description: Convenciones de código de App-Gastos (React + TypeScript, Supabase con RLS y migraciones, dinero en COP enteros, fechas y períodos, saldos derivados, i18n, PWA, seguridad de datos). Úsala siempre que vayas a escribir, modificar o refactorizar código, migraciones SQL, Edge Functions o configuración del proyecto.
---

# Buenas prácticas de código

## Principios

1. **El plan manda sobre el qué.** `docs/plan.md` y la especificación aprobada de la etapa definen qué se construye. No agregues funciones que no estén ahí, ni quites las que sí están.
2. **Ponytail manda sobre el cuánto.** Ponytail está activo en este proyecto (modo `full`; nunca `ultra`). Antes de escribir código, sube su escalera: ¿hace falta?, ¿ya existe en el repo?, ¿lo da la plataforma o una dependencia instalada? Si una sugerencia de Ponytail contradice el plan o recorta validaciones, seguridad, accesibilidad o pruebas, gana el plan.
3. **Pruebas primero en las reglas de cálculo** (skill `pruebas`).
4. **Una sola fuente para cada cosa**: un helper de formato de dinero, un cálculo de período, una función de normalización de nombres. Nada duplicado entre frontend y base de datos sin una prueba que verifique que coinciden.

## Arquitectura

```
src/
  dominio/       reglas de negocio puras en TypeScript: sin React, sin Supabase, sin Date.now()
  datos/         acceso a Supabase (consultas, mutaciones, tipos generados)
  components/ui/      shadcn (átomos)
  components/shared/  moléculas reutilizables entre módulos
  features/<módulo>/  components/ (organismos), hooks y lógica de UI del módulo: gastos, ingresos, bolsas, periodicos, prestamos, deudas, categorias, reportes…
  routes/             pantallas, layout común y protección de rutas (React Router 8, modo librería)
  i18n/               es.json, en.json
supabase/
  migrations/    SQL versionado
  tests/         pruebas pgTAP
  functions/     Edge Functions
```

- `dominio/` recibe la fecha de hoy y los datos como parámetros; así se prueba con un reloj fijo.
- Los componentes no calculan saldos ni totales: los piden a `dominio/` o a la base de datos.
- Un módulo de `features/` no importa componentes de otro módulo; lo compartido sube a `components/shared/`.
- **Todas las rutas protegidas** salvo `/login`, `/recuperar` y `/nueva-contrasena`, y **sin registro de usuarios** (ver `references/react-ts.md`, "Rutas").

## Referencias

- `references/react-ts.md`: TypeScript, React, formularios, estado y estructura.
- `references/supabase-rls-migraciones.md`: tablas, RLS, migraciones, funciones y Edge Functions.
- `references/dinero-y-fechas.md`: COP en enteros, períodos, periódicos, zona horaria y normalización de nombres.
- `references/i18n.md`: traducciones en español e inglés.

## Reglas que nunca se rompen

- **Montos en pesos enteros** (`bigint` en Postgres, `number` entero en TS). Nunca decimales ni `float`.
- **Saldos derivados** de los movimientos (presupuesto, bolsas, deudas, préstamos). Nunca una columna de saldo que el cliente escriba. El único dato guardado es el resumen al cerrar un período, que es una foto.
- **RLS activado en toda tabla** con `user_id`, con políticas por operación. Una tabla sin RLS no pasa la revisión.
- **Datos de tarjeta prohibidos**: las tarjetas se guardan solo con nombre descriptivo. Nunca número, vencimiento ni CVV, ni en la base, ni en logs, ni en pruebas (3.8).
- **La foto del QR no se guarda** ni se sube: se lee en el navegador y se descarta (3.10).
- **Secretos fuera del código**: la clave `service_role` solo vive en Edge Functions y en variables de entorno del servidor. El frontend usa solo la clave pública (anon/publishable).
- **Supabase local para todo** el desarrollo y las pruebas. Nada se aplica al proyecto real sin aprobación del usuario (`supabase db push`, `functions deploy` y `link` piden confirmación en `.claude/settings.json`).
- **Historial inmutable**: editar una regla periódica, una deuda o una categoría no cambia los gastos ya registrados (copias de nombre, ícono y color en el gasto).
- **Ningún texto visible** escrito en un componente: todo va en `i18n/`.
- **Dependencias nuevas** solo si la especificación las justifica.

## Antes de entregar

1. `npm run typecheck`, `npm run lint` y `npm test` en verde (los nombres exactos de los scripts se fijan en la Etapa 0).
2. Para cambios de base de datos: `supabase db reset` y `supabase test db` en verde.
3. Pasa la skill `revision-codigo`.
4. Si dejaste un atajo a propósito, márcalo con un comentario `shortcut:` explicando cuándo revisarlo; `/ponytail-debt` los recoge en el cierre de la etapa.

Para guía general de Supabase, en la Etapa 0 se puede agregar la skill oficial con `npx skills add supabase/agent-skills` (a nivel de proyecto). Si choca con estas reglas, ganan estas reglas.

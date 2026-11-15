# Supabase: tablas, RLS y migraciones

## Proyectos
- El proyecto Supabase **existente no se toca**. App-Gastos usa un segundo proyecto propio.
- Todo el desarrollo y las pruebas van contra **Supabase local** (`supabase start`). El proyecto real solo recibe migraciones aprobadas por el usuario, en la Etapa 12 o cuando él lo pida.

## Migraciones
- Una migración por cambio lógico: `supabase migration new <nombre_descriptivo>`. Nunca editar una migración ya fusionada a `main`; se corrige con otra nueva.
- Toda migración se prueba con `supabase db reset` (aplica todo desde cero) antes de entregar.
- Los datos de arranque del usuario (categorías predefinidas, formas de pago, categorías de ingreso) se crean por usuario al registrarse (trigger o función), porque son editables por cada usuario. `supabase/seed.sql` es solo para datos de prueba locales, nunca datos reales.

## Diseño de tablas
- Nombres en español y `snake_case`, en plural: `gastos`, `bolsas`, `reglas_periodicas`, `cuotas_deuda`.
- Cada tabla de usuario: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at timestamptz not null default now()`.
- Montos: `bigint not null check (valor >= 0)` (el signo lo da el tipo de movimiento, no el número).
- Fechas de negocio (fecha del gasto, inicio de período): `date`. Momentos (creado, confirmado): `timestamptz`.
- Enumeraciones del plan (tipo de categoría, estado de préstamo, clase de forma de pago) con `check` o `enum` de Postgres.
- Restricciones que impiden duplicados del plan:
  - `unique (user_id, nombre_normalizado)` en lugares y personas (3.9).
  - `unique (regla_id, fecha_programada)` en gastos generados por periódicos (3.6, sin duplicar).
  - `unique (deuda_id, numero)` en cuotas.
  - `unique (periodo_id, umbral)` en alertas enviadas (3.2, un aviso por umbral).
- Borrado de catálogos (categorías, lugares, formas de pago): *soft delete* (`archivada`) o `on delete set null` con la copia del nombre, ícono y color en el gasto, para conservar el historial (3.11, 3.14). Las categorías del sistema no se pueden borrar: protégelo con un `check`/trigger, no solo en la UI.
- Índices en las columnas por las que se filtra: `(user_id, fecha)`, `(user_id, periodo_id)`, `categoria_id`.

## RLS
- `alter table … enable row level security;` en **todas** las tablas del esquema `public`.
- Una política por operación, con `(select auth.uid())` (en subconsulta, para que Postgres lo evalúe una vez):

```sql
create policy "gastos_select_propios" on gastos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "gastos_insert_propios" on gastos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "gastos_update_propios" on gastos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gastos_delete_propios" on gastos for delete
  to authenticated using ((select auth.uid()) = user_id);
```

- Las relaciones también se validan: un gasto no puede apuntar a la bolsa o la categoría de otro usuario (política `with check` con `exists`, o llave foránea compuesta `(id, user_id)`).
- Vistas con `security_invoker = true` para que respeten RLS.
- Funciones `security definer` solo cuando sea imprescindible, con `set search_path = ''` y nombres calificados (`public.gastos`), y revisando que filtren por `auth.uid()`.
- Toda tabla nueva llega con sus pruebas pgTAP de RLS (skill `pruebas`, `references/rls-pgtap.md`).
- Revisa los avisos de seguridad y rendimiento (`get_advisors` del MCP de Supabase o el panel) después de cada migración.

## Saldos y cálculos
- Saldos como vistas o funciones `stable` que suman movimientos; nunca columnas que se actualicen a mano.
- Si una regla vive en SQL y en TypeScript (por ejemplo, la normalización de nombres), una prueba verifica que ambas den el mismo resultado con los mismos casos.

## Edge Functions y tareas programadas
- La tarea diaria (generar periódicos y cuotas, cerrar períodos, enviar alertas) es **idempotente**: si corre dos veces el mismo día, no duplica nada (gracias a las restricciones `unique` y a `insert … on conflict do nothing`).
- Recibe la fecha a procesar como parámetro (por defecto hoy en `America/Bogota`) para poder probarla y recuperar días atrasados (3.6).
- Usa la clave `service_role` solo dentro de la función, filtrando siempre por `user_id`.
- Valida la entrada y registra errores sin datos sensibles.

# Pruebas de base de datos con pgTAP

Corren con `supabase test db` contra Supabase local. Archivos en `supabase/tests/`, uno por tema: `rls_gastos.test.sql`, `historial_categorias.test.sql`, `periodicos_sin_duplicar.test.sql`.

## Plantilla de prueba de RLS

```sql
begin;
select plan(4);

-- Dos usuarios de prueba
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

-- Datos de A (insertados como superusuario)
insert into public.gastos (user_id, titulo, fecha, valor /* … */)
values ('00000000-0000-0000-0000-0000000000a1', 'Mercado', '2026-03-01', 50000);

-- Actuar como B
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is_empty($$ select * from public.gastos $$, 'B no ve los gastos de A');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor)
     values ('00000000-0000-0000-0000-0000000000a1', 'x', '2026-03-01', 1) $$,
  '42501', null, 'B no puede crear gastos a nombre de A');
select is((select count(*)::int from (update public.gastos set valor = 1 returning 1) t), 0,
  'B no puede editar gastos de A');
select is((select count(*)::int from (delete from public.gastos returning 1) t), 0,
  'B no puede borrar gastos de A');

select * from finish();
rollback;
```

Si en la Etapa 0 se agregan helpers (por ejemplo, `basejump-supabase_test_helpers` con `tests.create_supabase_user` y `tests.authenticate_as`), úsalos en lugar de escribir los claims a mano.

## Qué debe cubrir siempre

- **Toda tabla de usuario**: `select`, `insert`, `update` y `delete` cruzados entre dos usuarios.
- **Usuario anónimo** (`set local role anon`) no ve nada.
- **Relaciones cruzadas**: B no puede crear un gasto que apunte a la bolsa, categoría o lugar de A.
- Que todas las tablas de `public` tengan RLS activado:
  ```sql
  select is_empty($$ select tablename from pg_tables
    where schemaname = 'public' and not rowsecurity $$, 'todas las tablas tienen RLS');
  ```
- **Historial al borrar una categoría** (3.11): el gasto conserva nombre, ícono y color.
- **Categorías del sistema** no se pueden borrar ni siquiera por SQL directo del usuario.
- **Sin duplicados**: lugares y personas con el mismo normalizado; gasto periódico con la misma regla y fecha; alerta con el mismo umbral y período.
- **Saldos derivados**: la vista o función de saldo de bolsa coincide con la suma de movimientos de la semilla.

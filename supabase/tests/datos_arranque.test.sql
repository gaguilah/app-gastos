-- 3.11, 3.12 y 3.14: datos de arranque de cada usuario nuevo, idempotentes.
-- Decisión 11 de la especificación de la Etapa 2 (issue #7).
begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');

select results_eq($$ select count(*)::int from public.perfiles where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values (1) $$, 'el usuario nuevo tiene su perfil');
select results_eq($$ select idioma, dia_inicio, presupuesto_defecto from public.perfiles where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('es'::text, 1::smallint, 0::bigint) $$, 'el perfil arranca en español, día 1 y presupuesto 0');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and tipo = 'gasto' $$,
  $$ values (12) $$, '12 categorías de gasto (incluye Gasto desconocido)');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and clave_sistema is not null $$,
  $$ values (6) $$, '6 categorías del sistema');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and tipo = 'ingreso' $$,
  $$ values (4) $$, '4 categorías de ingreso');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values (21) $$, '21 categorías en total');
select results_eq($$ select nombre from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and tipo = 'ingreso' order by nombre $$,
  $$ values ('Extra'::text), ('Otros'), ('Salario'), ('Venta') $$, 'las de ingreso son Salario, Extra, Venta y Otros');
select results_eq(
  $$ select tipo, count(*)::int from public.categorias
      where user_id = '00000000-0000-0000-0000-0000000000a1' and clave_sistema is not null
      group by tipo order by tipo $$,
  $$ values ('deuda'::text, 2), ('gasto'::text, 1), ('prestamo'::text, 3) $$,
  'tipos de las categorías del sistema: 1 gasto, 3 préstamo y 2 deuda');
select results_eq(
  $$ select clase, count(*)::int from public.formas_pago where user_id = '00000000-0000-0000-0000-0000000000a1'
      group by clase order by clase $$,
  $$ values ('bolsa'::text, 3), ('canal'::text, 1), ('medio'::text, 3) $$,
  '7 formas de pago: 3 bolsas, 3 medios directos y 1 canal');
select results_eq(
  $$ select b.nombre, f.nombre from public.bolsas b join public.formas_pago f on f.id = b.forma_pago_id
      where b.user_id = '00000000-0000-0000-0000-0000000000a1' order by b.nombre $$,
  $$ values ('Daviplata'::text, 'Daviplata'::text), ('Efectivo', 'Efectivo'), ('Nequi', 'Nequi') $$,
  '3 bolsas, cada una con su forma de pago');

-- Idempotencia: llamarla otra vez no agrega filas.
select lives_ok($$ select public.inicializar_usuario('00000000-0000-0000-0000-0000000000a1') $$,
  'inicializar_usuario se puede volver a llamar');
select results_eq(
  $$ select (select count(*) from public.perfiles where user_id = '00000000-0000-0000-0000-0000000000a1')::int,
            (select count(*) from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1')::int,
            (select count(*) from public.formas_pago where user_id = '00000000-0000-0000-0000-0000000000a1')::int,
            (select count(*) from public.bolsas where user_id = '00000000-0000-0000-0000-0000000000a1')::int $$,
  $$ values (1, 21, 7, 3) $$, 'la segunda llamada no duplica nada');

-- Si el usuario borró una categoría normal, volver a inicializar no la revive.
delete from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Mascotas';
select public.inicializar_usuario('00000000-0000-0000-0000-0000000000a1');
select is_empty($$ select 1 from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Mascotas' $$,
  'una categoría que el usuario borró no vuelve');

-- Crear a B no cambia los datos de A.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values (20) $$, 'A conserva sus 20 categorías al crear a B');
select results_eq($$ select count(*)::int from public.categorias where user_id = '00000000-0000-0000-0000-0000000000b2' $$,
  $$ values (21) $$, 'B recibe sus propias 21 categorías');

-- Seguridad: la función es security definer con search_path vacío y la API no la puede llamar.
select results_eq(
  $$ select p.prosecdef, array_to_string(p.proconfig, ',') collate "C" from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'inicializar_usuario' $$,
  $$ values (true, 'search_path=""'::text collate "C") $$,
  'inicializar_usuario es security definer con search_path vacío');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.inicializar_usuario('00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'un usuario de la API no puede llamar a inicializar_usuario');

select * from finish();
rollback;

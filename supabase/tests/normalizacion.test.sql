-- 3.9 Lugares: nombres normalizados sin mayúsculas, tildes ni espacios extra.
-- Etapa 2, issue #7: casos de "Normalización" de la tabla TDD.
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');

select has_function('public', 'normalizar_nombre', array['text'],
  'existe public.normalizar_nombre(text)');

select is(
  (select p.provolatile::text from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'normalizar_nombre'),
  'i',
  'normalizar_nombre es immutable (sirve para una columna generada)');

select throws_ok(
  $$ insert into public.lugares (user_id, nombre)
     values ('00000000-0000-0000-0000-0000000000a1', '   ') $$,
  '23514', null,
  'un lugar cuyo nombre queda vacío al normalizar se rechaza');

select lives_ok(
  $$ insert into public.lugares (id, user_id, nombre)
     values ('00000000-0000-0000-0000-00000000c001',
             '00000000-0000-0000-0000-0000000000a1', 'Peña') $$,
  'se guarda el lugar "Peña"');

select results_eq(
  $$ select nombre, nombre_normalizado from public.lugares
      where id = '00000000-0000-0000-0000-00000000c001' $$,
  $$ values ('Peña'::text, 'pena'::text) $$,
  'el nombre visible conserva la ñ y el normalizado no la tiene');

select results_eq(
  $$ select public.normalizar_nombre('ÉXITO') $$,
  $$ values ('exito'::text) $$,
  'quita mayúsculas y tildes');

select results_eq(
  $$ select public.normalizar_nombre('  Éxito   Calle 80 ') $$,
  $$ values ('exito calle 80'::text) $$,
  'recorta y colapsa los espacios');

select results_eq(
  $$ select public.normalizar_nombre('Peña') $$,
  $$ values ('pena'::text) $$,
  'la eñe pasa a n');

select * from finish();
rollback;

-- 3.11 y 3.14: las categorías del sistema se renombran y cambian de ícono y color,
-- pero no se borran, archivan ni cambian de tipo o clave, ni con SQL directo del usuario.
-- Etapa 2, issue #7.
begin;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');

-- Como superusuario (así lo hará inicializar_usuario): crea una del sistema y una normal.
select lives_ok($$
  insert into public.categorias (id, user_id, nombre, icono, color, tipo, clave_sistema)
  values ('00000000-0000-0000-0001-0000000000f1', '00000000-0000-0000-0000-0000000000a1',
          'Gasto desconocido prueba', 'circle-help', '#3c4a42', 'gasto', 'gasto_desconocido')
  on conflict (user_id, clave_sistema) do update set nombre = excluded.nombre
  returning id;
  insert into public.categorias (id, user_id, nombre, icono, color, tipo)
  values ('00000000-0000-0000-0001-0000000000f2', '00000000-0000-0000-0000-0000000000a1',
          'Sin uso', 'tag', '#047857', 'gasto');
$$, 'montaje: una categoría del sistema y una normal de A');

-- Actuar como A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok(
  $$ delete from public.categorias where clave_sistema = 'gasto_desconocido' $$,
  'P0001', null, 'A no puede borrar una categoría del sistema');
select throws_ok(
  $$ update public.categorias set archivada = true where clave_sistema = 'gasto_desconocido' $$,
  'P0001', null, 'A no puede archivar una categoría del sistema');
select throws_ok(
  $$ update public.categorias set tipo = 'ingreso' where clave_sistema = 'gasto_desconocido' $$,
  'P0001', null, 'A no puede cambiar el tipo de una categoría del sistema');
select throws_ok(
  $$ update public.categorias set clave_sistema = null where clave_sistema = 'gasto_desconocido' $$,
  'P0001', null, 'A no puede quitarle la clave a una categoría del sistema');
select throws_ok(
  $$ update public.categorias set clave_sistema = 'pago_prestamos' where id = '00000000-0000-0000-0001-0000000000f2' $$,
  'P0001', null, 'A no puede convertir una categoría suya en del sistema');
select throws_ok(
  $$ insert into public.categorias (nombre, icono, color, tipo, clave_sistema)
     values ('Falsa', 'tag', '#047857', 'prestamo', 'cobro_prestamo') $$,
  'P0001', null, 'A no puede crear categorías del sistema');
select lives_ok(
  $$ update public.categorias set nombre = 'Sin explicar', icono = 'circle-dashed', color = '#ba1a1a'
      where clave_sistema = 'gasto_desconocido' $$,
  'A sí puede renombrar una del sistema y cambiarle ícono y color');
select results_eq(
  $$ select nombre, icono, color, clave_sistema, tipo from public.categorias where clave_sistema = 'gasto_desconocido' $$,
  $$ values ('Sin explicar'::text, 'circle-dashed'::text, '#ba1a1a'::text, 'gasto_desconocido'::text, 'gasto'::text) $$,
  'la categoría del sistema conserva su clave y su tipo tras renombrarla');
select results_eq(
  $$ with b as (delete from public.categorias where id = '00000000-0000-0000-0001-0000000000f2' returning 1)
     select count(*)::int from b $$,
  $$ values (1) $$,
  'A sí puede borrar una categoría normal sin uso');

-- Como superusuario: borrar al usuario borra también sus categorías del sistema.
reset role;
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'borrar el usuario no lo impide la protección de las categorías del sistema');
select is_empty(
  $$ select 1 from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  'las categorías del usuario borrado desaparecen');

select * from finish();
rollback;

-- 3.11 y 3.14: el historial no cambia al editar, archivar o intentar borrar una categoría.
-- Criterio principal de cierre de la Etapa 2. Issue #7.
begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');

select lives_ok($$
  insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Alimentación', 'utensils', '#b45309', 'gasto'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Transporte prueba', 'car', '#4343c8', 'gasto'),
    ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Salario prueba', 'briefcase', '#047857', 'ingreso');
  insert into public.categorias (id, user_id, nombre, tipo, padre_id) values
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Frutas', 'gasto', '00000000-0000-0000-0001-000000000001');
  insert into public.formas_pago (id, user_id, nombre, clase) values
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa prueba', 'bolsa');
  insert into public.bolsas (id, user_id, nombre, forma_pago_id) values
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa prueba', '00000000-0000-0000-0002-000000000001');
$$, 'montaje: categorías, subcategoría y bolsa de A');

-- Actuar como A, igual que la app.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$ insert into public.gastos (id, titulo, fecha, valor, categoria_id, subcategoria_id, bolsa_id, categoria_nombre)
     values ('00000000-0000-0000-000a-000000000001', 'Mercado', '2026-03-02', 50000,
             '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000003',
             '00000000-0000-0000-0003-000000000001', 'Nombre falso') $$,
  'A registra un gasto de Alimentación › Frutas');
select results_eq(
  $$ select categoria_nombre, categoria_icono, categoria_color, subcategoria_nombre
       from public.gastos where id = '00000000-0000-0000-000a-000000000001' $$,
  $$ values ('Alimentación'::text, 'utensils'::text, '#b45309'::text, 'Frutas'::text) $$,
  'el gasto copia la categoría real (no la que envía el cliente) y la subcategoría');

select lives_ok(
  $$ update public.categorias set nombre = 'Comida', color = '#047857', icono = 'soup'
      where id = '00000000-0000-0000-0001-000000000001' $$,
  'A renombra la categoría y le cambia ícono y color');
select lives_ok(
  $$ update public.categorias set nombre = 'Fruta y verdura' where id = '00000000-0000-0000-0001-000000000003' $$,
  'A renombra la subcategoría');
select lives_ok(
  $$ update public.categorias set archivada = true where id = '00000000-0000-0000-0001-000000000001' $$,
  'A archiva la categoría');
select results_eq(
  $$ select categoria_nombre, categoria_icono, categoria_color, subcategoria_nombre
       from public.gastos where id = '00000000-0000-0000-000a-000000000001' $$,
  $$ values ('Alimentación'::text, 'utensils'::text, '#b45309'::text, 'Frutas'::text) $$,
  'el gasto conserva el nombre, ícono y color con que se registró');

select throws_ok(
  $$ delete from public.categorias where id = '00000000-0000-0000-0001-000000000001' $$,
  '23503', null, 'una categoría en uso no se puede borrar');
select results_eq(
  $$ select count(*)::int from public.gastos where id = '00000000-0000-0000-000a-000000000001' $$,
  $$ values (1) $$, 'el gasto sigue intacto');

select lives_ok(
  $$ update public.gastos set categoria_id = '00000000-0000-0000-0001-000000000004', subcategoria_id = null
      where id = '00000000-0000-0000-000a-000000000001' $$,
  'A cambia la categoría de su gasto');
select results_eq(
  $$ select categoria_nombre, subcategoria_nombre from public.gastos where id = '00000000-0000-0000-000a-000000000001' $$,
  $$ values ('Transporte prueba'::text, null::text) $$,
  'al cambiar la categoría del gasto se copia la nueva');

select throws_ok(
  $$ insert into public.gastos (titulo, fecha, valor, categoria_id, subcategoria_id, bolsa_id)
     values ('Sub ajena', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000004',
             '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0003-000000000001') $$,
  '23514', null, 'la subcategoría del gasto debe ser hija de su categoría');
select throws_ok(
  $$ insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id)
     values ('Con categoría de ingreso', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000005',
             '00000000-0000-0000-0003-000000000001') $$,
  '23514', null, 'un gasto no puede tener una categoría de ingreso');

select * from finish();
rollback;

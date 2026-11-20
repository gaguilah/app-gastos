-- 3.1 Cierre de período: resumen con presupuesto, ingresos, gastado, saldo, gasto por categoría,
-- préstamos por cobrar y cuotas pendientes; recálculo del dinero si llega algo tardío.
-- Etapa 3, issue #8 (supuesto 19). Fechas fijas.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Mercado prueba', 'shopping-cart', '#b45309', 'gasto'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Hogar prueba', 'house', '#4343c8', 'gasto'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Salario prueba', 'briefcase', '#047857', 'ingreso'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Deuda prueba', 'landmark', '#4343c8', 'deuda');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio');
insert into public.personas (id, user_id, nombre, tipo) values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Ana Prueba', 'persona'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Banco Prueba', 'banco');
insert into public.periodos (id, user_id, fecha_inicio, fecha_fin, presupuesto) values
  ('00000000-0000-0000-0009-000000000011', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30', 1000000),
  ('00000000-0000-0000-0009-000000000012', '00000000-0000-0000-0000-0000000000a1', '2026-12-01', '2026-12-31', 1000000);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Movimientos de noviembre.
insert into public.gastos (id, titulo, fecha, valor, categoria_id, medio_id, estado, afecta_presupuesto) values
  ('00000000-0000-0000-0011-000000000001', 'G', '2026-11-03', 300000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'confirmado', true),
  ('00000000-0000-0000-0011-000000000002', 'G', '2026-11-04', 100000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'confirmado', true),
  ('00000000-0000-0000-0011-000000000003', 'G', '2026-11-05', 200000, '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000001', 'confirmado', true),
  ('00000000-0000-0000-0011-000000000004', 'G', '2026-11-06', 40000, '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000001', 'confirmado', false),
  ('00000000-0000-0000-0011-000000000005', 'G', '2026-11-07', 50000, '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000001', 'pendiente', true);
insert into public.ingresos (titulo, fecha, valor, categoria_id, cuenta_estadisticas) values
  ('Salario', '2026-11-15', 200000, '00000000-0000-0000-0001-000000000003', true),
  ('Préstamo recibido', '2026-11-16', 100000, '00000000-0000-0000-0001-000000000003', false);
-- Préstamo a Ana con un cobro parcial, y una deuda de 3 cuotas sin pagar.
insert into public.prestamos (id, persona_id, monto, fecha) values
  ('00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0004-000000000001', 100000, '2026-11-10');
insert into public.ingresos (titulo, fecha, valor, categoria_id, prestamo_id)
select 'Cobro', '2026-11-20', 30000, id, '00000000-0000-0000-0010-000000000001'
  from public.categorias where clave_sistema = 'cobro_prestamo';
insert into public.deudas (id, persona_id, categoria_id, fecha, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id) values
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000004',
   '2026-11-20', 300000, 3, 100000, 5, '00000000-0000-0000-0002-000000000001');
do $$ begin perform public.generar_plan_cuotas('00000000-0000-0000-0006-000000000001'); end $$;

-- Cierre (servidor).
reset role;
select is(public.cerrar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2026-11-30'), 0,
  'el último día del período todavía no se cierra');
select is(public.cerrar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2026-12-01'), 1,
  'al día siguiente del fin se cierra el período vencido');
select results_eq(
  $$ select fecha_inicio, cerrado_at is not null from public.periodos
      where user_id = '00000000-0000-0000-0000-0000000000a1' order by fecha_inicio $$,
  $$ values ('2026-11-01'::date, true), ('2026-12-01'::date, false) $$, 'solo se cierra el vencido');

select results_eq(
  $$ select (resumen->>'presupuesto')::bigint, (resumen->>'ingresos_presupuesto')::bigint,
            (resumen->>'ingresos_estadisticas')::bigint, (resumen->>'gastado')::bigint, (resumen->>'saldo')::bigint
       from public.periodos where id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (1000000::bigint, 330000::bigint, 230000::bigint, 600000::bigint, 730000::bigint) $$,
  'el resumen guarda presupuesto, ingresos (el cobro de 30.000 va al presupuesto), gastado y saldo (los pendientes no cuentan)');
select is(
  (select resumen->'por_categoria' from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  '[{"nombre": "Mercado prueba", "icono": "shopping-cart", "color": "#b45309", "total": 400000},
    {"nombre": "Hogar prueba", "icono": "house", "color": "#4343c8", "total": 240000}]'::jsonb,
  'el gasto por categoría usa el nombre copiado e incluye los gastos que no afectan el presupuesto');
select is(
  (select resumen->'prestamos_por_cobrar' from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  '{"cantidad": 1, "saldo": 70000}'::jsonb, 'préstamos pendientes por cobrar al cierre');
select is(
  (select resumen->'cuotas_pendientes' from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  '{"cantidad": 3, "valor": 300000}'::jsonb, 'cuotas de deudas pendientes al cierre');
select is(public.cerrar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2026-12-02'), 0,
  'correrlo otra vez no vuelve a cerrar');

-- Movimientos tardíos con fecha de noviembre (como A).
set local role authenticated;
insert into public.gastos (id, titulo, fecha, valor, categoria_id, medio_id) values
  ('00000000-0000-0000-0011-000000000006', 'Tardío', '2026-11-15', 50000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select results_eq(
  $$ select (resumen->>'gastado')::bigint, (resumen->>'saldo')::bigint, (resumen->'por_categoria'->0->>'total')::bigint
       from public.periodos where id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (650000::bigint, 680000::bigint, 450000::bigint) $$,
  'un gasto tardío con fecha del período cerrado actualiza su resumen');

-- Un cobro en diciembre no cambia lo pendiente guardado al cierre de noviembre.
insert into public.ingresos (titulo, fecha, valor, categoria_id, prestamo_id)
select 'Cobro', '2026-12-05', 70000, id, '00000000-0000-0000-0010-000000000001'
  from public.categorias where clave_sistema = 'cobro_prestamo';
select is(
  (select resumen->'prestamos_por_cobrar' from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  '{"cantidad": 1, "saldo": 70000}'::jsonb, 'préstamos y cuotas pendientes quedan como estaban al cierre');

-- Editar y borrar también recalcula; confirmar el pendiente también.
update public.gastos set valor = 80000 where id = '00000000-0000-0000-0011-000000000006';
select is((select (resumen->>'gastado')::bigint from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  680000::bigint, 'editar un gasto del período cerrado recalcula');
delete from public.gastos where id = '00000000-0000-0000-0011-000000000006';
select is((select (resumen->>'gastado')::bigint from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  600000::bigint, 'borrarlo también recalcula');
do $$ begin perform public.confirmar_gasto_pendiente('00000000-0000-0000-0011-000000000005'); end $$;
select is((select (resumen->>'gastado')::bigint from public.periodos where id = '00000000-0000-0000-0009-000000000011'),
  650000::bigint, 'confirmar tarde un pendiente del período cerrado recalcula');

-- Aislamiento.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.cerrar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-01-01') $$,
  '42501', null, 'el cierre no se puede llamar por la API');

select * from finish();
rollback;

-- 3.1 Presupuesto y período: vista previa del cambio de día de inicio, presupuesto por defecto,
-- ajuste del período en curso; 3.2 alertas al borrar un ingreso al presupuesto.
-- Etapa 6, issue #11 (supuestos 8 a 11 y 17). Fechas fijas.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.periodos (id, user_id, fecha_inicio, fecha_fin, presupuesto, cerrado_at) values
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-10-01', '2026-10-31', 1000000, now()),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30', 1000000, null),
  ('00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0000-0000000000b2', '2027-01-01', '2027-01-31', 1000000, null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- vista previa del día de inicio
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(15, '2026-11-26') $$,
  $$ values (1, '2026-11-01'::date, '2026-11-30'::date),
            (2, '2026-12-01', '2026-12-14'),
            (3, '2026-12-15', '2027-01-14') $$,
  'día 15: el actual no cambia, luego una transición del 1 al 14 y después del 15 al 14');
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(1, '2026-11-26') $$,
  $$ values (1, '2026-11-01'::date, '2026-11-30'::date),
            (2, '2026-12-01', '2026-12-31'),
            (3, '2027-01-01', '2027-01-31') $$,
  'el mismo día de inicio no tiene transición');
select throws_ok($$ select * from public.vista_previa_periodos(32, '2026-11-26') $$, 'P0001', 'periodo.dia_invalido',
  'un día de inicio fuera de 1 a 31 se rechaza');

-- La vista previa coincide con lo que crea la base de datos al cambiar el día.
update public.perfiles set dia_inicio = 15;
reset role;
select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-01-20');
select results_eq(
  $$ select fecha_inicio, fecha_fin from public.periodos
      where user_id = '00000000-0000-0000-0000-0000000000a1' and fecha_inicio > '2026-11-01' order by fecha_inicio $$,
  $$ values ('2026-12-01'::date, '2026-12-14'::date), ('2026-12-15', '2027-01-14'), ('2027-01-15', '2027-02-14') $$,
  'los períodos creados son los de la vista previa');
delete from public.periodos where user_id = '00000000-0000-0000-0000-0000000000a1' and fecha_inicio > '2026-11-01';
set local role authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(31, '2027-01-20') $$,
  $$ values (1, '2027-01-01'::date, '2027-01-31'::date),
            (2, '2027-02-01', '2027-02-27'),
            (3, '2027-02-28', '2027-03-30') $$,
  'día 31: en febrero el período empieza el último día del mes');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- presupuesto por defecto
select lives_ok($$ select public.cambiar_presupuesto_defecto(500000, false, '2026-11-26') $$,
  'cambiar el presupuesto por defecto');
select results_eq(
  $$ select (select presupuesto_defecto from public.perfiles),
            (select presupuesto from public.periodos where id = '00000000-0000-0000-0009-000000000002') $$,
  $$ values (500000::bigint, 1000000::bigint) $$,
  'sin la casilla, el período actual no cambia');
select lives_ok($$ select public.cambiar_presupuesto_defecto(600000, true, '2026-11-26') $$,
  'cambiar el presupuesto por defecto y el del período actual');
select results_eq(
  $$ select (select presupuesto_defecto from public.perfiles),
            (select presupuesto from public.periodos where id = '00000000-0000-0000-0009-000000000002'),
            (select presupuesto from public.periodos where id = '00000000-0000-0000-0009-000000000001') $$,
  $$ values (600000::bigint, 600000::bigint, 1000000::bigint) $$,
  'con la casilla cambia el período en curso, no los cerrados');
select throws_ok($$ select public.cambiar_presupuesto_defecto(-1) $$, 'P0001', 'presupuesto.valor_invalido',
  'un presupuesto negativo se rechaza');

-- ---------------------------------------------------------------- ajustar el período
select results_eq(
  $$ select presupuesto, nota_presupuesto from public.ajustar_presupuesto_periodo('00000000-0000-0000-0009-000000000002', 200000, 'Prima') $$,
  $$ values (800000::bigint, 'Prima') $$,
  'el ajuste suma al presupuesto del período y guarda el motivo');
select results_eq(
  $$ select presupuesto, nota_presupuesto from public.ajustar_presupuesto_periodo('00000000-0000-0000-0009-000000000002', -100000) $$,
  $$ values (700000::bigint, null::text) $$,
  'un ajuste negativo resta');
select throws_ok($$ select public.ajustar_presupuesto_periodo('00000000-0000-0000-0009-000000000002', -800000) $$,
  'P0001', 'presupuesto.valor_invalido', 'un ajuste que deja el presupuesto por debajo de $0 se rechaza');
select throws_ok($$ select public.ajustar_presupuesto_periodo('00000000-0000-0000-0009-000000000001', 1000) $$,
  'P0001', 'periodo.cerrado', 'un período cerrado no se ajusta');
select throws_ok($$ select public.ajustar_presupuesto_periodo('00000000-0000-0000-0009-000000000003', 1000) $$,
  'P0002', 'periodo.no_existe', 'no se ajusta el período de otro usuario');

-- ---------------------------------------------------------------- alertas al borrar un ingreso
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
insert into public.ingresos (id, titulo, fecha, valor, categoria_id, categoria_nombre)
select '00000000-0000-0000-0010-000000000001', 'Prima', '2027-01-05', 200000, id, ''
  from public.categorias where nombre = 'Extra';
insert into public.gastos (titulo, fecha, valor, categoria_id, categoria_nombre, medio_id)
select 'Arriendo', '2027-01-06', 750000, c.id, '', f.id
  from public.categorias c, public.formas_pago f where c.nombre = 'Hogar' and f.nombre = 'Débito';
delete from public.ingresos where id = '00000000-0000-0000-0010-000000000001';
select results_eq(
  $$ select umbral from public.alertas_enviadas order by umbral $$,
  $$ values (70::smallint), (75::smallint) $$,
  'borrar un ingreso al presupuesto sube el uso al 75 % y registra las alertas 70 y 75');

select * from finish();
rollback;
